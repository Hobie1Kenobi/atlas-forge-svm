use anchor_lang::prelude::*;

#[error_code]
pub enum AtlasForgeError {
    #[msg("Only the merchant authority may call this instruction")]
    Unauthorized,
    #[msg("Merchant is paused; new receipts are rejected")]
    Paused,
    #[msg("Payment would exceed spend_cap_per_payer_window")]
    OverCap,
    #[msg("Amount is below the configured price")]
    Underpay,
    #[msg("Token mint does not match the merchant config mint")]
    WrongMint,
    #[msg("Nonce was already settled for this payer")]
    ReplayNonce,
    #[msg("Checked arithmetic overflow")]
    Overflow,
    #[msg("Mint decimals must be 6")]
    InvalidDecimals,
    #[msg("Treasury ATA owner does not match config.treasury")]
    WrongTreasury,
}
