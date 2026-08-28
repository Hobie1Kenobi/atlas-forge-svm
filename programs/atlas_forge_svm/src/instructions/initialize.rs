use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::*;
use crate::error::AtlasForgeError;
use crate::events::InitEvent;
use crate::state::MerchantConfig;

#[derive(Accounts)]
#[instruction(price_atomic: u64, spend_cap_per_payer_window: u64, treasury: Pubkey)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + MerchantConfig::INIT_SPACE,
        seeds = [MERCHANT_SEED, authority.key().as_ref()],
        bump
    )]
    pub config: Account<'info, MerchantConfig>,

    pub mint: Account<'info, Mint>,

    #[account(
        token::mint = mint,
        token::authority = treasury,
    )]
    pub treasury_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handle_initialize(
    ctx: Context<Initialize>,
    price_atomic: u64,
    spend_cap_per_payer_window: u64,
    treasury: Pubkey,
) -> Result<()> {
    require!(
        ctx.accounts.mint.decimals == USDC_DECIMALS,
        AtlasForgeError::InvalidDecimals
    );
    require_keys_eq!(
        ctx.accounts.treasury_ata.owner,
        treasury,
        AtlasForgeError::WrongTreasury
    );

    let config = &mut ctx.accounts.config;
    config.authority = ctx.accounts.authority.key();
    config.treasury = treasury;
    config.mint = ctx.accounts.mint.key();
    config.price_atomic = price_atomic;
    config.spend_cap_per_payer_window = spend_cap_per_payer_window;
    config.paused = false;
    config.bump = ctx.bumps.config;

    emit!(InitEvent {
        authority: config.authority,
        treasury: config.treasury,
        mint: config.mint,
        price_atomic,
        spend_cap_per_payer_window,
    });
    Ok(())
}
