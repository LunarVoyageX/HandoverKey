import { splitSecret, reconstructSecret, verifyShares } from './shamir';
import { ValidationError } from './errors';

describe('Shamir Secret Sharing', () => {
  it('should split and reconstruct a secret with minimum shares', () => {
    const secret = new Uint8Array([1, 2, 3, 4, 5]);
    const shares = splitSecret(secret, 5, 3);

    expect(shares).toHaveLength(5);

    // Reconstruct with exactly threshold shares
    const reconstructed = reconstructSecret([shares[0], shares[1], shares[2]]);
    expect(reconstructed).toEqual(secret);
  });

  it('should reconstruct with more than threshold shares', () => {
    const secret = new Uint8Array([1, 2, 3, 4, 5]);
    const shares = splitSecret(secret, 5, 3);

    // Reconstruct with 4 shares
    const reconstructed = reconstructSecret([
      shares[0],
      shares[1],
      shares[2],
      shares[3],
    ]);
    expect(reconstructed).toEqual(secret);
  });

  it('should reconstruct with all shares', () => {
    const secret = new Uint8Array([1, 2, 3, 4, 5]);
    const shares = splitSecret(secret, 5, 3);

    const reconstructed = reconstructSecret(shares);
    expect(reconstructed).toEqual(secret);
  });

  it('should work with different share combinations', () => {
    const secret = new Uint8Array([1, 2, 3, 4, 5]);
    const shares = splitSecret(secret, 5, 3);

    // Try different combinations of 3 shares
    const combinations = [
      [shares[0], shares[1], shares[2]],
      [shares[0], shares[2], shares[4]],
      [shares[1], shares[3], shares[4]],
      [shares[2], shares[3], shares[4]],
    ];

    for (const combo of combinations) {
      const reconstructed = reconstructSecret(combo);
      expect(reconstructed).toEqual(secret);
    }
  });

  it('should handle large secrets', () => {
    const secret = new Uint8Array(32);
    for (let i = 0; i < secret.length; i++) {
      secret[i] = i;
    }

    const shares = splitSecret(secret, 10, 5);
    const reconstructed = reconstructSecret(shares.slice(0, 5));

    expect(reconstructed).toEqual(secret);
  });

  it('should produce different shares each time', () => {
    const secret = new Uint8Array([1, 2, 3, 4, 5]);

    const shares1 = splitSecret(secret, 5, 3);
    const shares2 = splitSecret(secret, 5, 3);

    // Shares should be different (due to random coefficients)
    expect(shares1[0]).not.toEqual(shares2[0]);

    // But both should reconstruct to same secret
    expect(reconstructSecret(shares1.slice(0, 3))).toEqual(secret);
    expect(reconstructSecret(shares2.slice(0, 3))).toEqual(secret);
  });

  it('should throw ValidationError for invalid inputs', () => {
    const secret = new Uint8Array([1, 2, 3, 4, 5]);

    // Invalid total shares
    expect(() => splitSecret(secret, 1, 2)).toThrow(ValidationError);

    // Invalid threshold
    expect(() => splitSecret(secret, 5, 1)).toThrow(ValidationError);

    // Threshold > total shares
    expect(() => splitSecret(secret, 3, 5)).toThrow(ValidationError);

    // Empty secret
    expect(() => splitSecret(new Uint8Array(), 5, 3)).toThrow(ValidationError);

    // Too many shares
    expect(() => splitSecret(secret, 256, 3)).toThrow(ValidationError);
  });

  it('should fail to reconstruct correctly with insufficient shares', () => {
    const secret = new Uint8Array([1, 2, 3, 4, 5]);
    const shares = splitSecret(secret, 5, 3);

    // With only 2 shares (threshold is 3), reconstruction will succeed
    // but produce incorrect result
    const reconstructed = reconstructSecret([shares[0], shares[1]]);
    
    // Should not match the original secret
    expect(reconstructed).not.toEqual(secret);
  });

  it('should throw ValidationError for duplicate shares', () => {
    const secret = new Uint8Array([1, 2, 3, 4, 5]);
    const shares = splitSecret(secret, 5, 3);

    // Try to reconstruct with duplicate shares
    expect(() =>
      reconstructSecret([shares[0], shares[0], shares[1]])
    ).toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid share format', () => {
    const invalidShare = new Uint8Array([1, 2, 3]); // Wrong length

    expect(() => reconstructSecret([invalidShare, invalidShare])).toThrow(
      ValidationError
    );
  });

  it('should verify valid shares', () => {
    const secret = new Uint8Array([1, 2, 3, 4, 5]);
    const shares = splitSecret(secret, 5, 3);

    expect(verifyShares([shares[0], shares[1], shares[2]])).toBe(true);
  });

  it('should reject invalid shares', () => {
    const secret = new Uint8Array([1, 2, 3, 4, 5]);
    const shares = splitSecret(secret, 5, 3);

    // Corrupt a share
    shares[0][1] ^= 1;

    expect(verifyShares([shares[0], shares[1], shares[2]])).toBe(false);
  });

  it('should handle 2-of-2 threshold', () => {
    const secret = new Uint8Array([1, 2, 3, 4, 5]);
    const shares = splitSecret(secret, 2, 2);

    expect(shares).toHaveLength(2);

    const reconstructed = reconstructSecret(shares);
    expect(reconstructed).toEqual(secret);
  });

  it('should handle high threshold', () => {
    const secret = new Uint8Array([1, 2, 3, 4, 5]);
    const shares = splitSecret(secret, 10, 8);

    expect(shares).toHaveLength(10);

    // Need 8 shares to reconstruct
    const reconstructed = reconstructSecret(shares.slice(0, 8));
    expect(reconstructed).toEqual(secret);
  });
});
