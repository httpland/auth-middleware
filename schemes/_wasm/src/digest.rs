use digest::{
  core_api::BlockSizeUser, Digest, DynDigest,
  Reset,
};
/// Enum wrapper over all supported digest implementations.
#[derive(Clone)]
pub enum Context {
  Md5(Box<md5::Md5>),
  Sha512_256(Box<sha2::Sha512_256>),
}

use Context::*;

impl Context {
  pub fn new(algorithm_name: &str) -> Result<Context, &'static str> {
    Ok(match algorithm_name {
      "MD5" => Md5(Default::default()),
      "SHA-512-256" => Sha512_256(Default::default()),
      _ => return Err("unsupported algorithm"),
    })
  }

  /// The input block length for the algorithm, in bytes.
  pub fn input_block_length(&self) -> usize {
    // For algorithm types that implement BlockInput and have a statically
    // available BlockSize as part of their type definition, we use that value.
    fn static_block_length<T: BlockSizeUser>(_: &T) -> usize {
      <T::BlockSize as typenum::Unsigned>::to_usize()
    }

    match self {
      Md5(context) => static_block_length(&**context),
      Sha512_256(context) => static_block_length(&**context),
    }
  }

  /// The output digest length for the algorithm, in bytes.
  ///
  /// If the algorithm is variable-length, this returns its default length.
  pub fn output_length(&self) -> usize {
    match self {
      Md5(context) => context.output_size(),
      Sha512_256(context) => context.output_size(),
    }
  }

  /// The name of the algorithm used by this context.
  ///
  /// Names are all uppercase (for ease of case-insensitive comparisons) and
  /// will match the name formatting used in WebCrypto if the algorithm is
  /// supported by WebCrypto, and otherwise match the formatting used in the
  /// official specification for the algorithm.
  pub const fn algorithm_name(&self) -> &'static str {
    match self {
      Md5(_) => "MD5",
      Sha512_256(_) => "SHA-512-256",
    }
  }

  pub fn reset(&mut self) {
    match self {
      Md5(context) => Reset::reset(&mut **context),
      Sha512_256(context) => Reset::reset(&mut **context),
    };
  }

  pub fn update(&mut self, data: &[u8]) {
    match self {
      Md5(context) => Digest::update(&mut **context, data),
      Sha512_256(context) => Digest::update(&mut **context, data),
    };
  }

  pub fn digest_and_drop(
    self,
    length: Option<usize>,
  ) -> Result<Box<[u8]>, &'static str> {
    if let Some(length) = length {
      if length != self.output_length() {
        return Err(
          "non-default length specified for non-extendable algorithm",
        );
      }
    }

    Ok(match self {
      Md5(context) => context.finalize(),
      Sha512_256(context) => context.finalize(),
    })
  }

  pub fn digest_and_reset(
    &mut self,
    length: Option<usize>,
  ) -> Result<Box<[u8]>, &'static str> {
    if let Some(length) = length {
      if length != self.output_length() {
        return Err(
          "non-default length specified for non-extendable algorithm",
        );
      }
    }

    Ok(match self {
      Md5(context) => DynDigest::finalize_reset(context.as_mut()),
      Sha512_256(context) => DynDigest::finalize_reset(context.as_mut()),
    })
  }

  pub fn digest(
    &self,
    length: Option<usize>,
  ) -> Result<Box<[u8]>, &'static str> {
    self.clone().digest_and_drop(length)
  }
}
