use anchor_lang::prelude::*;

#[constant]
pub const MERCHANT_SEED: &[u8] = b"merchant";

#[constant]
pub const RECEIPT_SEED: &[u8] = b"receipt";

#[constant]
pub const WINDOW_SEED: &[u8] = b"window";

/// Spend-cap window length in slots (~one Devnet epoch).
#[constant]
pub const WINDOW_SLOTS: u64 = 432_000;

/// Circle Devnet USDC and this program's local mints are 6 decimals.
#[constant]
pub const USDC_DECIMALS: u8 = 6;
