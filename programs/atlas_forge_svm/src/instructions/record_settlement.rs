use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::*;
use crate::error::AtlasForgeError;
use crate::events::PaidEvent;
use crate::state::{MerchantConfig, PayerSpend, Receipt};

#[derive(Accounts)]
#[instruction(amount: u64, resource_hash: [u8; 32], nonce: u64)]
pub struct RecordSettlement<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [MERCHANT_SEED, config.authority.as_ref()],
        bump = config.bump,
        has_one = authority @ AtlasForgeError::Unauthorized,
        has_one = mint @ AtlasForgeError::WrongMint,
        has_one = treasury @ AtlasForgeError::WrongTreasury,
    )]
    pub config: Account<'info, MerchantConfig>,

    pub mint: Account<'info, Mint>,

    /// CHECK: constrained via config.has_one = treasury and treasury_ata authority.
    pub treasury: UncheckedAccount<'info>,

    #[account(
        token::mint = mint,
        token::authority = treasury,
    )]
    pub treasury_ata: Account<'info, TokenAccount>,

    /// CHECK: x402 payer; receipt PDA is keyed by this pubkey.
    pub payer: UncheckedAccount<'info>,

    #[account(
        token::mint = mint,
        token::authority = payer,
    )]
    pub payer_ata: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + Receipt::INIT_SPACE,
        seeds = [
            RECEIPT_SEED,
            config.key().as_ref(),
            payer.key().as_ref(),
            &nonce.to_le_bytes()
        ],
        bump
    )]
    pub receipt: Account<'info, Receipt>,

    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + PayerSpend::INIT_SPACE,
        seeds = [WINDOW_SEED, config.key().as_ref(), payer.key().as_ref()],
        bump
    )]
    pub payer_spend: Account<'info, PayerSpend>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handle_record_settlement(
    ctx: Context<RecordSettlement>,
    amount: u64,
    resource_hash: [u8; 32],
    nonce: u64,
) -> Result<()> {
    let config = &ctx.accounts.config;
    require!(!config.paused, AtlasForgeError::Paused);
    require!(amount >= config.price_atomic, AtlasForgeError::Underpay);
    require_keys_eq!(
        ctx.accounts.mint.key(),
        config.mint,
        AtlasForgeError::WrongMint
    );
    require_eq!(
        ctx.accounts.mint.decimals,
        USDC_DECIMALS,
        AtlasForgeError::InvalidDecimals
    );
    require_keys_eq!(
        ctx.accounts.payer_ata.mint,
        config.mint,
        AtlasForgeError::WrongMint
    );
    require_keys_eq!(
        ctx.accounts.treasury_ata.mint,
        config.mint,
        AtlasForgeError::WrongMint
    );

    let receipt = &mut ctx.accounts.receipt;
    require!(!receipt.settled, AtlasForgeError::ReplayNonce);

    let clock = Clock::get()?;
    let window_id = clock.slot / WINDOW_SLOTS;
    let payer_spend = &mut ctx.accounts.payer_spend;
    if payer_spend.payer == Pubkey::default() {
        payer_spend.payer = ctx.accounts.payer.key();
        payer_spend.window_id = window_id;
        payer_spend.spent = 0;
        payer_spend.bump = ctx.bumps.payer_spend;
    } else if payer_spend.window_id != window_id {
        payer_spend.window_id = window_id;
        payer_spend.spent = 0;
    }

    let new_spent = payer_spend
        .spent
        .checked_add(amount)
        .ok_or(AtlasForgeError::Overflow)?;
    require!(
        new_spent <= config.spend_cap_per_payer_window,
        AtlasForgeError::OverCap
    );
    payer_spend.spent = new_spent;

    receipt.payer = ctx.accounts.payer.key();
    receipt.amount = amount;
    receipt.slot = clock.slot;
    receipt.resource_hash = resource_hash;
    receipt.nonce = nonce;
    receipt.settled = true;
    receipt.bump = ctx.bumps.receipt;

    emit!(PaidEvent {
        payer: receipt.payer,
        amount,
        slot: receipt.slot,
        resource_hash,
        nonce,
        receipt: receipt.key(),
    });
    Ok(())
}
