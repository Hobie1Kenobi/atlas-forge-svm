use anchor_lang::prelude::*;

#[event]
pub struct InitEvent {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub mint: Pubkey,
    pub price_atomic: u64,
    pub spend_cap_per_payer_window: u64,
}

#[event]
pub struct PaidEvent {
    pub payer: Pubkey,
    pub amount: u64,
    pub slot: u64,
    pub resource_hash: [u8; 32],
    pub nonce: u64,
    pub receipt: Pubkey,
}
