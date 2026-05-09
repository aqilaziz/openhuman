use super::{decrypt_handoff_blob, key_bytes_from_string};
use base64::engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD};
use base64::Engine;

#[test]
fn decodes_base64url_no_pad() {
    // A 32-byte key that, when base64url-encoded, contains both `-` and `_`.
    let raw = [
        0xff_u8, 0xfb, 0xef, 0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa,
        0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a,
        0x0b, 0x0c, 0x0d,
    ];
    let url_key = URL_SAFE_NO_PAD.encode(raw);
    assert!(url_key.contains('-') || url_key.contains('_'));
    let decoded = key_bytes_from_string(&url_key).unwrap();
    assert_eq!(decoded, raw);
}

#[test]
fn decodes_standard_base64() {
    let raw = [0x41_u8; 32];
    let std_key = STANDARD.encode(raw);
    let decoded = key_bytes_from_string(&std_key).unwrap();
    assert_eq!(decoded, raw);
}

#[test]
fn decodes_raw_32_byte_key() {
    let raw = "abcdefghijklmnopqrstuvwxyz012345";
    assert_eq!(raw.len(), 32);
    let decoded = key_bytes_from_string(raw).unwrap();
    assert_eq!(decoded, raw.as_bytes());
}

#[test]
fn trims_whitespace() {
    let raw = [0x42_u8; 32];
    let url_key = format!("  {}\n", URL_SAFE_NO_PAD.encode(raw));
    let decoded = key_bytes_from_string(&url_key).unwrap();
    assert_eq!(decoded, raw);
}

#[test]
fn rejects_wrong_length() {
    let err = key_bytes_from_string("tooshort").unwrap_err();
    assert!(err.to_string().contains("must decode to 32 raw bytes"));
}

#[test]
fn decrypts_valid_blob() {
    // Generated via Node.js crypto:
    // Key: QkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkI=
    // B64: JCQkJCQkJCQkJCQkJCQkJO0jqP9aSaielDGEQULvHaKPe7g8HW8rFwWa2g==
    let key = "QkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkI=";
    let b64 = "JCQkJCQkJCQkJCQkJCQkJO0jqP9aSaielDGEQULvHaKPe7g8HW8rFwWa2g==";
    let decrypted = decrypt_handoff_blob(b64, key).unwrap();
    assert_eq!(decrypted, "hello world");
}

#[test]
fn decrypt_fails_if_too_short() {
    let key = "QkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkI=";
    let b64 = STANDARD.encode([0u8; 31]);
    let err = decrypt_handoff_blob(&b64, key).unwrap_err();
    assert!(err.to_string().contains("encrypted payload too short"));
}

#[test]
fn decrypt_fails_on_invalid_base64() {
    let key = "QkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkI=";
    let err = decrypt_handoff_blob("not-base64!!!", key).unwrap_err();
    assert!(err.to_string().contains("base64-decode encrypted payload"));
}

#[test]
fn decrypt_fails_on_wrong_key() {
    let key = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="; // wrong key
    let b64 = "JCQkJCQkJCQkJCQkJCQkJO0jqP9aSaielDGEQULvHaKPe7g8HW8rFwWa2g==";
    let err = decrypt_handoff_blob(b64, key).unwrap_err();
    assert!(err.to_string().contains("AES-GCM decrypt failed"));
}

#[test]
fn decrypt_fails_on_tampered_ciphertext() {
    let key = "QkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkI=";
    let mut combined = STANDARD.decode("JCQkJCQkJCQkJCQkJCQkJO0jqP9aSaielDGEQULvHaKPe7g8HW8rFwWa2g==").unwrap();
    // Tamper with the last byte of ciphertext
    let last = combined.len() - 1;
    combined[last] ^= 0xFF;
    let b64 = STANDARD.encode(combined);
    let err = decrypt_handoff_blob(&b64, key).unwrap_err();
    assert!(err.to_string().contains("AES-GCM decrypt failed"));
}

#[test]
fn decrypt_fails_on_invalid_utf8() {
    // Need a valid AES-GCM payload that decrypts to non-UTF8 bytes
    // Using Node.js to generate:
    // const crypto = require('crypto');
    // const key = Buffer.alloc(32, 'B');
    // const iv = Buffer.alloc(16, '$');
    // const plaintext = Buffer.from([0xFF, 0xFE, 0xFD]);
    // const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    // let ct = cipher.update(plaintext);
    // ct = Buffer.concat([ct, cipher.final()]);
    // const tag = cipher.getAuthTag();
    // const combined = Buffer.concat([iv, tag, ct]);
    // console.log(combined.toString('base64'));
    // -> JCQkJCQkJCQkJCQkJCQkJI9mD7G5mIu67Hq+f565+ZpQ784=

    let key = "QkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkI=";
    let b64 = "JCQkJCQkJCQkJCQkJCQkJI9mD7G5mIu67Hq+f565+ZpQ784=";
    let err = decrypt_handoff_blob(b64, key).unwrap_err();
    assert!(err.to_string().contains("handoff plaintext is not UTF-8"));
}
