import { encryptData, decryptData } from "./encryption";

describe("Encryption Service", () => {
  const testData = "This is test data";
  const testPassword = "testPassword123!";

  it("should encrypt and decrypt data successfully", async () => {
    const encrypted = await encryptData(testData, testPassword);

    expect(encrypted.encryptedData).toBeTruthy();
    expect(encrypted.iv).toBeTruthy();
    expect(encrypted.salt).toBeTruthy();
    expect(encrypted.algorithm).toBe("AES-256-GCM");

    const decrypted = await decryptData({
      encryptedData: encrypted.encryptedData,
      iv: encrypted.iv,
      salt: encrypted.salt,
      password: testPassword,
    });

    expect(decrypted).toBe(testData);
  });

  it("should generate unique IV and salt for each encryption", async () => {
    const result1 = await encryptData(testData, testPassword);
    const result2 = await encryptData(testData, testPassword);

    expect(result1.iv).not.toBe(result2.iv);
    expect(result1.salt).not.toBe(result2.salt);
    expect(result1.encryptedData).not.toBe(result2.encryptedData);
  });

  it("should fail with wrong password", async () => {
    const encrypted = await encryptData(testData, testPassword);

    await expect(
      decryptData({
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        salt: encrypted.salt,
        password: "wrongPassword",
      }),
    ).rejects.toThrow();
  });
});
