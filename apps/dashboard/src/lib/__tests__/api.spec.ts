import { api, apiGet, apiPost, apiPut, apiDelete } from '../api';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('api()', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('makes a GET request and returns JSON', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: 'test' }),
    });

    const result = await api('/test');
    expect(result).toEqual({ data: 'test' });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/test',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });

  it('sends JSON body for POST', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: '1' }),
    });

    await apiPost('/sites', { name: 'Test' });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/sites',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      }),
    );
  });

  it('sends PUT request', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiPut('/sites/1', { name: 'Updated' });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/sites/1',
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('sends DELETE request', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiDelete('/sites/1');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/sites/1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: 'Not found' }),
    });

    await expect(api('/missing')).rejects.toThrow('Not found');
  });

  it('handles 204 No Content', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 204,
    });

    const result = await api('/empty');
    expect(result).toBeUndefined();
  });

  it('throws on 401 with session expired message', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    });

    await expect(api('/protected')).rejects.toThrow('Session expired');
  });
});
