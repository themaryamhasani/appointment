import { WaitingListService } from './waiting-list.service';

describe('WaitingListService promotion rules', () => {
  const prisma = {
    waitingListEntry: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const audit = { log: jest.fn() };
  const service = new WaitingListService(prisma as any, audit as any);
  const admin = { id: 'u1', isSuperAdmin: true, clinicIds: [] } as any;

  beforeEach(() => jest.clearAllMocks());

  it('promotes WAITING entries', async () => {
    prisma.waitingListEntry.findUnique.mockResolvedValue({
      id: 'e1',
      clinicId: 'c1',
      status: 'WAITING',
    });
    prisma.waitingListEntry.update.mockResolvedValue({ id: 'e1', status: 'PROMOTED' });
    const result = await service.promote(admin, 'e1');
    expect(result.status).toBe('PROMOTED');
    expect(prisma.waitingListEntry.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { status: 'PROMOTED' },
    });
  });

  it('rejects non-waiting promotion', async () => {
    prisma.waitingListEntry.findUnique.mockResolvedValue({
      id: 'e1',
      clinicId: 'c1',
      status: 'PROMOTED',
    });
    await expect(service.promote(admin, 'e1')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_STATUS' }),
    });
  });
});
