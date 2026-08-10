import { HashedFileStateService } from '../../../src/services/state/HashedFileStateService';

const SALT = 'test-salt';
const USERNAME = 'alice';

type ScoresFile = { scores: Record<string, number>; sha: string | undefined };
type SpyableService = {
  readScoresFile: () => Promise<ScoresFile>;
  writeScoresFile: (scores: Record<string, number>, sha: string | undefined) => Promise<void>;
};

describe('HashedFileStateService', () => {
  let service: HashedFileStateService;

  const mockRead = (s: HashedFileStateService, result: ScoresFile) =>
    jest.spyOn(s as unknown as SpyableService, 'readScoresFile').mockResolvedValue(result);

  const mockWrite = (s: HashedFileStateService) =>
    jest.spyOn(s as unknown as SpyableService, 'writeScoresFile').mockResolvedValue(undefined);

  beforeEach(() => {
    service = new HashedFileStateService('token', SALT);
  });

  it('should return 0 if user has no score', async () => {
    mockRead(service, { scores: {}, sha: undefined });
    expect(await service.getUserPoints(USERNAME)).toBe(0);
  });

  it('should return the correct score for a known hash', async () => {
    const anotherService = new HashedFileStateService('token', SALT);
    const hash = await getHash(anotherService, USERNAME);
    mockRead(service, { scores: { [hash]: 7 }, sha: 'abc' });
    expect(await service.getUserPoints(USERNAME)).toBe(7);
  });

  it('should increment an existing score', async () => {
    const hash = await getHash(service, USERNAME);
    mockRead(service, { scores: { [hash]: 4 }, sha: 'abc' });
    const write = mockWrite(service);
    await service.incrementUserPoints(USERNAME);
    expect(write).toHaveBeenCalledWith({ [hash]: 5 }, 'abc');
  });

  it('should create a new entry when user has no score yet', async () => {
    const hash = await getHash(service, USERNAME);
    mockRead(service, { scores: {}, sha: undefined });
    const write = mockWrite(service);
    await service.incrementUserPoints(USERNAME, 3);
    expect(write).toHaveBeenCalledWith({ [hash]: 3 }, undefined);
  });

  it('should hash usernames case-insensitively', async () => {
    mockRead(service, { scores: {}, sha: undefined });
    mockWrite(service);
    const hash1 = await getHash(service, 'Alice');
    const hash2 = await getHash(service, 'alice');
    const hash3 = await getHash(service, 'ALICE');
    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);
  });

  it('should produce different hashes for different salts', async () => {
    const service2 = new HashedFileStateService('token', 'other-salt');
    const hash1 = await getHash(service, USERNAME);
    const hash2 = await getHash(service2, USERNAME);
    expect(hash1).not.toBe(hash2);
  });
});

// Helper: access the private hash method via the protected pattern
async function getHash(service: HashedFileStateService, username: string): Promise<string> {
  let capturedHash = '';
  const readSpy = jest
    .spyOn(service as unknown as SpyableService, 'readScoresFile')
    .mockResolvedValue({ scores: {}, sha: undefined });
  const writeSpy = jest
    .spyOn(service as unknown as SpyableService, 'writeScoresFile')
    .mockImplementation(async (scores) => {
      capturedHash = Object.keys(scores)[0];
    });
  await service.incrementUserPoints(username, 0);
  readSpy.mockRestore();
  writeSpy.mockRestore();
  return capturedHash;
}
