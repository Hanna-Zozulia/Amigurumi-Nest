const { mockModels } = require('../../helpers/dbMock');

jest.mock('../../../models', () => ({
  getModels: jest.fn(() => require('../../helpers/dbMock').mockModels)
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue(undefined)
  }))
}));

const service = require('../../../services/inactiveUsersService');

describe('inactiveUsersService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockModels.User.findAll.mockReset();
  });

  it('returns early when models are missing', async () => {
    const models = require('../../../models');
    models.getModels.mockReturnValueOnce(null);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await service.runInactiveUsersCheck('manual');

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('checked=0, deactivated=0'));
    logSpy.mockRestore();
  });

  it('deactivates eligible users and sends notifications', async () => {
    const user = {
      id: 1,
      name: 'Old User',
      email: 'old@test.com',
      status: 'active',
      lastLoginAt: new Date('2020-01-01'),
      createdAt: new Date('2020-01-01'),
      update: jest.fn().mockResolvedValue({})
    };

    mockModels.User.findAll.mockResolvedValueOnce([user]);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await service.runInactiveUsersCheck('manual');

    expect(mockModels.User.findAll).toHaveBeenCalled();
    expect(user.update).toHaveBeenCalledWith({ status: 'inactive' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('checked=1, deactivated=1'));
    logSpy.mockRestore();
  });

});
