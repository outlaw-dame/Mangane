import { repairAncestorContext } from '../ancestor-context';

const status = (id: string, inReplyToId: string | null = null) => ({
  id,
  in_reply_to_id: inReplyToId,
});

describe('repairAncestorContext', () => {
  it('hydrates an omitted direct parent and preserves root-to-parent order', async() => {
    const fetchStatusById = jest.fn(async(id: string) => {
      if (id === 'parent') return status('parent', 'root');
      if (id === 'root') return status('root');
      throw new Error('unexpected status');
    });

    const result = await repairAncestorContext(status('reply', 'parent'), [], fetchStatusById);

    expect(result.ancestors.map(item => item.id)).toEqual(['root', 'parent']);
    expect(result.fetched.map(item => item.id)).toEqual(['parent', 'root']);
    expect(fetchStatusById).toHaveBeenCalledTimes(2);
  });

  it('reuses known ancestors and only fetches the missing link', async() => {
    const fetchStatusById = jest.fn(async(id: string) => status(id, 'root'));

    const result = await repairAncestorContext(
      status('reply', 'parent'),
      [status('root')],
      fetchStatusById,
    );

    expect(result.ancestors.map(item => item.id)).toEqual(['root', 'parent']);
    expect(result.fetched.map(item => item.id)).toEqual(['parent']);
    expect(fetchStatusById).toHaveBeenCalledWith('parent');
  });

  it('stops safely on unavailable parents without discarding known context', async() => {
    const fetchStatusById = jest.fn(async() => {
      throw new Error('not found');
    });

    const result = await repairAncestorContext(status('reply', 'parent'), [], fetchStatusById);

    expect(result).toEqual({ ancestors: [], fetched: [] });
  });

  it('rejects mismatched status responses and prevents cycles', async() => {
    const mismatched = jest.fn(async() => status('different'));
    const mismatchResult = await repairAncestorContext(status('reply', 'parent'), [], mismatched);
    expect(mismatchResult.ancestors).toEqual([]);

    const cyclic = jest.fn(async(id: string) => status(id, id === 'parent' ? 'reply' : null));
    const cycleResult = await repairAncestorContext(status('reply', 'parent'), [], cyclic);
    expect(cycleResult.ancestors.map(item => item.id)).toEqual(['parent']);
    expect(cyclic).toHaveBeenCalledTimes(1);
  });
});
