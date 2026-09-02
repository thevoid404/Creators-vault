import { paginate } from './paginated-response.dto';

describe('paginate', () => {
  it('reports the page window in the middle of a result set', () => {
    const result = paginate(['a', 'b'], 137, 3, 20);

    expect(result.meta).toEqual({
      page: 3,
      limit: 20,
      total: 137,
      totalPages: 7,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it('has no next page on the last page', () => {
    expect(paginate([], 40, 2, 20).meta).toMatchObject({
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  it('reports no pages for an empty result set', () => {
    expect(paginate([], 0, 1, 20).meta).toMatchObject({
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });
});
