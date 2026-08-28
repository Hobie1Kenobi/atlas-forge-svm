use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::AtlasForgeError;
use crate::state::MerchantConfig;

#[derive(Accounts)]
pub struct SetPaused<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [MERCHANT_SEED, config.authority.as_ref()],
        bump = config.bump,
        has_one = authority @ AtlasForgeError::Unauthorized,
    )]
    pub config: Account<'info, MerchantConfig>,
}

pub fn handle_pause(ctx: Context<SetPaused>) -> Result<()> {
    ctx.accounts.config.paused = true;
    Ok(())
}

pub fn handle_unpause(ctx: Context<SetPaused>) -> Result<()> {
    ctx.accounts.config.paused = false;
    Ok(())
}
