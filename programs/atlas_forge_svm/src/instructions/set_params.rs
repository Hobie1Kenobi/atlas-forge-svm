use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::*;
use crate::error::AtlasForgeError;
use crate::state::MerchantConfig;

#[derive(Accounts)]
#[instruction(price_atomic: u64, spend_cap_per_payer_window: u64, treasury: Pubkey)]
pub struct SetParams<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [MERCHANT_SEED, config.authority.as_ref()],
        bump = config.bump,
        has_one = authority @ AtlasForgeError::Unauthorized,
        has_one = mint @ AtlasForgeError::WrongMint,
    )]
    pub config: Account<'info, MerchantConfig>,

    pub mint: Account<'info, Mint>,

    #[account(
        token::mint = mint,
        token::authority = treasury,
    )]
    pub treasury_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handle_set_params(
    ctx: Context<SetParams>,
    price_atomic: u64,
    spend_cap_per_payer_window: u64,
    treasury: Pubkey,
) -> Result<()> {
    require_keys_eq!(
        ctx.accounts.treasury_ata.owner,
        treasury,
        AtlasForgeError::WrongTreasury
    );
    require_keys_eq!(
        ctx.accounts.mint.key(),
        ctx.accounts.config.mint,
        AtlasForgeError::WrongMint
    );

    let config = &mut ctx.accounts.config;
    config.price_atomic = price_atomic;
    config.spend_cap_per_payer_window = spend_cap_per_payer_window;
    config.treasury = treasury;
    Ok(())
}
