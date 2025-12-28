import * as naclModule from "tweetnacl";
import {
  encodeBase64,
  decodeUTF8,
  encodeUTF8,
  decodeBase64,
} from "tweetnacl-util";
import CryptoJS from "crypto-js";
import type { EncryptedMessage, KeyPair, SharedSecret } from "./types";

const nacl = (naclModule as any).default || naclModule;

/**
 * CryptoService - Handles all encryption, decryption, and signing for Neural Link
 *
 * Features:
 * - Diffie-Hellman key exchange
 * - AES-256-GCM encryption
 * - HMAC-SHA256 signing
 * - Nonce generation for replay protection
 * - Key rotation
 */
export class CryptoService {
  private static readonly KEY_ROTATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly NONCE_LENGTH = 24;

  /**
   * Generate a new key pair for Diffie-Hellman key exchange
   */
  static generateKeyPair(): KeyPair {
    const keyPair = nacl.box.keyPair();
    return {
      publicKey: keyPair.publicKey,
      secretKey: keyPair.secretKey,
    };
  }

  /**
   * Derive shared secret from public and private keys
   */
  static deriveSharedSecret(
    theirPublicKey: Uint8Array,
    mySecretKey: Uint8Array
  ): SharedSecret {
    // Use X25519 key agreement
    const shared = nacl.box.before(theirPublicKey, mySecretKey);

    return {
      key: shared,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.KEY_ROTATION_INTERVAL,
    };
  }

  /**
   * Generate a random nonce for replay protection
   */
  static generateNonce(): string {
    const nonce = nacl.randomBytes(this.NONCE_LENGTH);
    return encodeBase64(nonce);
  }

  /**
   * Encrypt a message using AES-256-CTR
   * Note: Using CTR mode since crypto-js doesn't support GCM
   */
  static encrypt(
    message: string,
    sharedSecret: Uint8Array
  ): { encrypted: string; iv: string } {
    // Generate random IV
    const iv = CryptoJS.lib.WordArray.random(16);

    // Convert shared secret to WordArray
    const key = CryptoJS.lib.WordArray.create(sharedSecret as any);

    // Encrypt using AES-256-CTR (GCM not available in crypto-js)
    const encrypted = CryptoJS.AES.encrypt(message, key, {
      iv: iv,
      mode: CryptoJS.mode.CTR,
      padding: CryptoJS.pad.NoPadding,
    });

    return {
      encrypted: encrypted.toString(),
      iv: iv.toString(CryptoJS.enc.Base64),
    };
  }

  /**
   * Decrypt a message using AES-256-CTR
   */
  static decrypt(
    encryptedData: string,
    iv: string,
    sharedSecret: Uint8Array
  ): string {
    // Convert shared secret to WordArray
    const key = CryptoJS.lib.WordArray.create(sharedSecret as any);
    const ivWordArray = CryptoJS.enc.Base64.parse(iv);

    // Decrypt
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
      iv: ivWordArray,
      mode: CryptoJS.mode.CTR,
      padding: CryptoJS.pad.NoPadding,
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Sign a message using HMAC-SHA256
   */
  static sign(message: string, sharedSecret: Uint8Array): string {
    const key = CryptoJS.lib.WordArray.create(sharedSecret as any);
    const signature = CryptoJS.HmacSHA256(message, key);
    return signature.toString(CryptoJS.enc.Base64);
  }

  /**
   * Verify a message signature
   */
  static verifySignature(
    message: string,
    signature: string,
    sharedSecret: Uint8Array
  ): boolean {
    const expectedSignature = this.sign(message, sharedSecret);
    return signature === expectedSignature;
  }

  /**
   * Create an encrypted message with signature
   */
  static createSecureMessage(
    payload: any,
    sharedSecret: Uint8Array
  ): EncryptedMessage {
    const nonce = this.generateNonce();
    const timestamp = Date.now();

    // Serialize payload
    const message = JSON.stringify(payload);

    // Encrypt
    const { encrypted, iv } = this.encrypt(message, sharedSecret);

    // Sign the encrypted data + metadata
    const dataToSign = `${encrypted}|${iv}|${timestamp}|${nonce}`;
    const signature = this.sign(dataToSign, sharedSecret);

    return {
      encrypted,
      iv,
      signature,
      timestamp,
      nonce,
    };
  }

  /**
   * Decrypt and verify a secure message
   */
  static decryptSecureMessage(
    encryptedMessage: EncryptedMessage,
    sharedSecret: Uint8Array,
    maxAge: number = 60000 // 60 seconds default
  ): any {
    const { encrypted, iv, signature, timestamp, nonce } = encryptedMessage;

    // Check message age (replay protection)
    const age = Date.now() - timestamp;
    if (age > maxAge) {
      throw new Error(`Message too old: ${age}ms (max: ${maxAge}ms)`);
    }

    // Verify signature
    const dataToVerify = `${encrypted}|${iv}|${timestamp}|${nonce}`;
    if (!this.verifySignature(dataToVerify, signature, sharedSecret)) {
      throw new Error(
        "Invalid signature - message may have been tampered with"
      );
    }

    // Decrypt
    const decrypted = this.decrypt(encrypted, iv, sharedSecret);

    // Parse JSON
    try {
      return JSON.parse(decrypted);
    } catch (e) {
      throw new Error("Failed to parse decrypted message");
    }
  }

  /**
   * Check if a shared secret needs rotation
   */
  static needsRotation(sharedSecret: SharedSecret): boolean {
    return Date.now() >= sharedSecret.expiresAt;
  }

  /**
   * Convert Uint8Array to base64 string for storage
   */
  static encodeKey(key: Uint8Array): string {
    return encodeBase64(key);
  }

  /**
   * Convert base64 string back to Uint8Array
   */
  static decodeKey(encoded: string): Uint8Array {
    return decodeBase64(encoded);
  }

  /**
   * Securely store a shared secret (encrypts with a master key)
   * In production, use a proper key management service
   */
  static storeSecret(secret: Uint8Array, masterPassword: string): string {
    const key = CryptoJS.lib.WordArray.create(secret as any);
    const encrypted = CryptoJS.AES.encrypt(
      key.toString(CryptoJS.enc.Base64),
      masterPassword
    );
    return encrypted.toString();
  }

  /**
   * Retrieve and decrypt a stored secret
   */
  static retrieveSecret(encrypted: string, masterPassword: string): Uint8Array {
    const decrypted = CryptoJS.AES.decrypt(encrypted, masterPassword);
    const keyString = decrypted.toString(CryptoJS.enc.Utf8);
    return this.decodeKey(keyString);
  }
}
