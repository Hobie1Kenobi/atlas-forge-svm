pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use error::*;
pub use events::*;
pub use instructions::*;
pub use state::*;

declare_id!("CFogKbTTNkDn9kQr6pNtnMDJnqTCTcaF9t5dzYajtVwA");

/// Cap/pause/replay receipt registry.
///
/// Honesty line: x402 on this repo is exact SPL TransferChecked to the
/// merchant ATA. The Anchor program is a cap/pause/replay receipt registry,
/// not the settlement target.
#[program]
pub mod atlas_forge_svm {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        price_atomic: u64,
        spend_cap_per_payer_window: u64,
        treasury: Pubkey,
    ) -> Result<()> {
        crate::instructions::initialize::handle_initialize(
            ctx,
            price_atomic,
            spend_cap_per_payer_window,
            treasury,
        )
    }

    pub fn set_params(
        ctx: Context<SetParams>,
        price_atomic: u64,
        spend_cap_per_payer_window: u64,
        treasury: Pubkey,
    ) -> Result<()> {
        crate::instructions::set_params::handle_set_params(
            ctx,
            price_atomic,
            spend_cap_per_payer_window,
            treasury,
        )
    }

    pub fn pause(ctx: Context<SetPaused>) -> Result<()> {
        crate::instructions::pause::handle_pause(ctx)
    }

    pub fn unpause(ctx: Context<SetPaused>) -> Result<()> {
        crate::instructions::pause::handle_unpause(ctx)
    }

    pub fn record_settlement(
        ctx: Context<RecordSettlement>,
        amount: u64,
        resource_hash: [u8; 32],
        nonce: u64,
    ) -> Result<()> {
        crate::instructions::record_settlement::handle_record_settlement(
            ctx,
            amount,
            resource_hash,
            nonce,
        )
    }
}
