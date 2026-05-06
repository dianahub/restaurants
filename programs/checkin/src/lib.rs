use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};

declare_id!("CHKNxaum1111111111111111111111111111111111111");

const COOLDOWN_SECONDS: i64 = 86400; // 24 hours
const BASE_XAUM_REWARD: u64 = 100; // 0.0001 XAUm (6 decimals → 100 = 0.000100)
const MAX_MULTIPLIER: u8 = 10;

#[program]
pub mod checkin {
    use super::*;

    pub fn check_in(ctx: Context<CheckIn>) -> Result<()> {
        let clock = Clock::get()?;
        let state = &mut ctx.accounts.check_in_state;

        require!(
            clock.unix_timestamp - state.last_check_in >= COOLDOWN_SECONDS,
            CheckInError::CooldownActive
        );

        let restaurant = &ctx.accounts.restaurant_nft;
        let multiplier = ctx.accounts.restaurant_config.reward_multiplier.max(1) as u64;
        let xaum_amount = BASE_XAUM_REWARD * multiplier;

        // Mint XAUm to user
        let seeds = &[b"mint_authority".as_ref(), &[ctx.bumps.mint_authority]];
        let signer = &[&seeds[..]];
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.xaum_mint.to_account_info(),
                    to: ctx.accounts.user_xaum_account.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                signer,
            ),
            xaum_amount,
        )?;

        state.last_check_in = clock.unix_timestamp;
        state.total_check_ins += 1;

        emit!(CheckInEvent {
            wallet: ctx.accounts.user.key(),
            restaurant: restaurant.key(),
            timestamp: clock.unix_timestamp,
            xaum_amount,
        });

        Ok(())
    }

    pub fn event_check_in(ctx: Context<EventCheckIn>) -> Result<()> {
        let clock = Clock::get()?;
        let event_config = &ctx.accounts.event_config;
        let multiplier = event_config.gold_multiplier.min(MAX_MULTIPLIER).max(1) as u64;
        let xaum_amount = BASE_XAUM_REWARD * multiplier;

        let seeds = &[b"mint_authority".as_ref(), &[ctx.bumps.mint_authority]];
        let signer = &[&seeds[..]];
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.xaum_mint.to_account_info(),
                    to: ctx.accounts.user_xaum_account.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                signer,
            ),
            xaum_amount,
        )?;

        let state = &mut ctx.accounts.event_check_in_state;
        state.checked_in = true;
        state.timestamp = clock.unix_timestamp;

        emit!(CheckInEvent {
            wallet: ctx.accounts.user.key(),
            restaurant: ctx.accounts.event_nft.key(),
            timestamp: clock.unix_timestamp,
            xaum_amount,
        });

        Ok(())
    }

    pub fn update_reward_multiplier(
        ctx: Context<UpdateMultiplier>,
        multiplier: u8,
    ) -> Result<()> {
        require!(multiplier >= 1 && multiplier <= MAX_MULTIPLIER, CheckInError::InvalidMultiplier);
        ctx.accounts.restaurant_config.reward_multiplier = multiplier;
        Ok(())
    }

    pub fn rsvp_event(ctx: Context<RsvpEvent>) -> Result<()> {
        let clock = Clock::get()?;
        let rsvp = &mut ctx.accounts.rsvp_record;
        rsvp.wallet = ctx.accounts.user.key();
        rsvp.event_nft = ctx.accounts.event_nft.key();
        rsvp.timestamp = clock.unix_timestamp;
        Ok(())
    }
}

// --- Accounts ---

#[derive(Accounts)]
pub struct CheckIn<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: Restaurant NFT mint address used as identifier
    pub restaurant_nft: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + CheckInState::INIT_SPACE,
        seeds = [b"checkin", user.key().as_ref(), restaurant_nft.key().as_ref()],
        bump
    )]
    pub check_in_state: Account<'info, CheckInState>,

    #[account(
        seeds = [b"restaurant_config", restaurant_nft.key().as_ref()],
        bump
    )]
    pub restaurant_config: Account<'info, RestaurantConfig>,

    #[account(mut)]
    pub xaum_mint: Account<'info, Mint>,

    #[account(mut, constraint = user_xaum_account.owner == user.key())]
    pub user_xaum_account: Account<'info, TokenAccount>,

    /// CHECK: PDA mint authority
    #[account(seeds = [b"mint_authority"], bump)]
    pub mint_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EventCheckIn<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: Event NFT mint address
    pub event_nft: UncheckedAccount<'info>,

    #[account(
        seeds = [b"event_config", event_nft.key().as_ref()],
        bump
    )]
    pub event_config: Account<'info, EventConfig>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + EventCheckInState::INIT_SPACE,
        seeds = [b"event_checkin", user.key().as_ref(), event_nft.key().as_ref()],
        bump
    )]
    pub event_check_in_state: Account<'info, EventCheckInState>,

    #[account(mut)]
    pub xaum_mint: Account<'info, Mint>,

    #[account(mut, constraint = user_xaum_account.owner == user.key())]
    pub user_xaum_account: Account<'info, TokenAccount>,

    /// CHECK: PDA mint authority
    #[account(seeds = [b"mint_authority"], bump)]
    pub mint_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateMultiplier<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK: Restaurant NFT mint — owner must hold it
    pub restaurant_nft: UncheckedAccount<'info>,

    /// Owner's token account proving NFT ownership
    #[account(
        constraint = owner_nft_account.owner == owner.key(),
        constraint = owner_nft_account.mint == restaurant_nft.key(),
        constraint = owner_nft_account.amount >= 1
    )]
    pub owner_nft_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + RestaurantConfig::INIT_SPACE,
        seeds = [b"restaurant_config", restaurant_nft.key().as_ref()],
        bump
    )]
    pub restaurant_config: Account<'info, RestaurantConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RsvpEvent<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: Event NFT mint address
    pub event_nft: UncheckedAccount<'info>,

    #[account(
        init,
        payer = user,
        space = 8 + RsvpRecord::INIT_SPACE,
        seeds = [b"rsvp", user.key().as_ref(), event_nft.key().as_ref()],
        bump
    )]
    pub rsvp_record: Account<'info, RsvpRecord>,

    pub system_program: Program<'info, System>,
}

// --- State ---

#[account]
#[derive(InitSpace)]
pub struct CheckInState {
    pub last_check_in: i64,
    pub total_check_ins: u64,
}

#[account]
#[derive(InitSpace)]
pub struct RestaurantConfig {
    pub reward_multiplier: u8,
}

#[account]
#[derive(InitSpace)]
pub struct EventConfig {
    pub gold_multiplier: u8,
}

#[account]
#[derive(InitSpace)]
pub struct EventCheckInState {
    pub checked_in: bool,
    pub timestamp: i64,
}

#[account]
#[derive(InitSpace)]
pub struct RsvpRecord {
    pub wallet: Pubkey,
    pub event_nft: Pubkey,
    pub timestamp: i64,
}

// --- Events ---

#[event]
pub struct CheckInEvent {
    pub wallet: Pubkey,
    pub restaurant: Pubkey,
    pub timestamp: i64,
    pub xaum_amount: u64,
}

// --- Errors ---

#[error_code]
pub enum CheckInError {
    #[msg("24-hour cooldown still active")]
    CooldownActive,
    #[msg("Multiplier must be between 1 and 10")]
    InvalidMultiplier,
}
