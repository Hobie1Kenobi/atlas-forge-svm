use anchor_lang::prelude::*;

/// Cap/pause/replay registry for a single merchant. Not the x402 settlement target.
#[account]
#[derive(InitSpace)]
pub struct MerchantConfig {
    pub authority: Pubkey,
    /// Owner of the USDC ATA that x402 TransferChecked pays (`payTo`).
    pub treasury: Pubkey,
    pub mint: Pubkey,
    pub price_atomic: u64,
    pub spend_cap_per_payer_window: u64,
    pub paused: bool,
    pub bump: u8,
}

/// One settled access grant. Pause does not mutate already-settled receipts.
#[account]
#[derive(InitSpace)]
pub struct Receipt {
    pub payer: Pubkey,
    pub amount: u64,
    pub slot: u64,
    pub resource_hash: [u8; 32],
    pub nonce: u64,
    pub settled: bool,
    pub bump: u8,
}

/// Per-payer spend accumulator; resets when `slot / WINDOW_SLOTS` changes.
#[account]
#[derive(InitSpace)]
pub struct PayerSpend {
    pub payer: Pubkey,
    pub window_id: u64,
    pub spent: u64,
    pub bump: u8,
}
