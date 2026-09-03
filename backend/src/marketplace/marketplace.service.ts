import { Injectable, Logger, NotFoundException, NotImplementedException } from '@nestjs/common';
import { ListingStatus } from '@prisma/client';
import { paginate, type PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { PaymentsService } from '../payments/payments.service';
import type {
  CreateListingDto,
  ListListingsQueryDto,
  ListingResponseDto,
  PurchaseListingDto,
  PurchaseResponseDto,
  UpdateListingDto,
} from './dto/marketplace.dto';

/**
 * ============================================================================
 * MARKETPLACE — STUB MODULE
 * ============================================================================
 *
 * The database schema (`marketplace_listings`, `marketplace_listing_items`),
 * the routes and the DTOs are **final**. The business logic is not implemented,
 * because selling assets needs seller verification, payouts, tax handling and
 * refund policy — none of which is in scope for this build.
 *
 * What that means in practice:
 *
 *  * **Read endpoints return deterministic mock listings**, so the frontend can
 *    be built and demoed against realistic data today.
 *  * **Write endpoints throw 501 `NotImplementedException`** with a message that
 *    says what is missing, rather than silently pretending to have stored
 *    something.
 *  * **Purchase is wired through the `PaymentProvider` interface** even though
 *    it cannot take money. That is deliberate: it proves the seam works, and it
 *    means swapping `MockPaymentProvider` for a real one is a one-file change.
 *
 * Every response carries `isStub: true` so no caller can mistake this for a
 * working marketplace.
 */
@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(private readonly payments: PaymentsService) {}

  /**
   * Fixed sample listings. Deterministic on purpose — a frontend developer needs
   * stable ids to link against while building, which random fixtures would not
   * give them.
   */
  private static readonly MOCK_LISTINGS: ListingResponseDto[] = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      seller: {
        id: '99999999-9999-4999-8999-999999999999',
        name: 'Sample Seller',
        avatarUrl: null,
      },
      title: 'AudioLux UI Kit',
      description: 'A sample listing. The marketplace is not implemented in this build.',
      price: 29,
      currency: 'USD',
      coverUrl: null,
      status: ListingStatus.published,
      items: [
        {
          assetId: '22222222-2222-4222-8222-222222222222',
          title: 'Dashboard mockup',
          type: 'design_file',
          previewUrl: null,
        },
        {
          assetId: '33333333-3333-4333-8333-333333333333',
          title: 'Icon set',
          type: 'vector',
          previewUrl: null,
        },
      ],
      itemCount: 2,
      publishedAt: new Date('2026-08-01T10:00:00.000Z'),
      createdAt: new Date('2026-08-01T10:00:00.000Z'),
      updatedAt: new Date('2026-08-01T10:00:00.000Z'),
      isStub: true,
    },
    {
      id: '44444444-4444-4444-8444-444444444444',
      seller: {
        id: '99999999-9999-4999-8999-999999999999',
        name: 'Sample Seller',
        avatarUrl: null,
      },
      title: 'Gradient Poster Pack',
      description: 'A second sample listing, priced to trigger the mock decline path.',
      // .99 is the MockPaymentProvider's simulated-decline trigger, so the
      // failure path is testable from the fixtures alone.
      price: 12.99,
      currency: 'USD',
      coverUrl: null,
      status: ListingStatus.published,
      items: [
        {
          assetId: '55555555-5555-4555-8555-555555555555',
          title: 'Gradient poster 01',
          type: 'image',
          previewUrl: null,
        },
      ],
      itemCount: 1,
      publishedAt: new Date('2026-08-14T10:00:00.000Z'),
      createdAt: new Date('2026-08-14T10:00:00.000Z'),
      updatedAt: new Date('2026-08-14T10:00:00.000Z'),
      isStub: true,
    },
  ];

  // TODO: implement when payment integration is added.
  async create(_sellerId: string, _dto: CreateListingDto): Promise<ListingResponseDto> {
    throw new NotImplementedException(
      'Creating marketplace listings is not implemented in this build. The database schema, this route and its DTO are final; selling requires seller verification and payouts, which are out of scope.',
    );
  }

  // TODO: implement when payment integration is added.
  async update(
    _sellerId: string,
    _id: string,
    _dto: UpdateListingDto,
  ): Promise<ListingResponseDto> {
    throw new NotImplementedException(
      'Updating marketplace listings is not implemented in this build.',
    );
  }

  // TODO: implement when payment integration is added.
  async remove(_sellerId: string, _id: string): Promise<void> {
    throw new NotImplementedException(
      'Deleting marketplace listings is not implemented in this build.',
    );
  }

  /** Returns mock listings. The query shape is final and is honoured by the filtering below. */
  async list(query: ListListingsQueryDto): Promise<PaginatedResponseDto<ListingResponseDto>> {
    // The filters are applied to the fixtures so the frontend can exercise them
    // for real, rather than discovering later that they were ignored.
    let rows = [...MarketplaceService.MOCK_LISTINGS];

    if (query.status) {
      rows = rows.filter((listing) => listing.status === query.status);
    }
    if (query.sellerId) {
      rows = rows.filter((listing) => listing.seller.id === query.sellerId);
    }
    if (query.minPrice !== undefined) {
      rows = rows.filter((listing) => listing.price >= query.minPrice!);
    }
    if (query.maxPrice !== undefined) {
      rows = rows.filter((listing) => listing.price <= query.maxPrice!);
    }
    if (query.q) {
      const term = query.q.toLowerCase();
      rows = rows.filter(
        (listing) =>
          listing.title.toLowerCase().includes(term) ||
          (listing.description ?? '').toLowerCase().includes(term),
      );
    }

    const direction = query.sortOrder === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const left = a[query.sortBy] ?? 0;
      const right = b[query.sortBy] ?? 0;
      return left === right ? 0 : (left < right ? -1 : 1) * direction;
    });

    const page = rows.slice(query.skip, query.skip + query.limit);
    return paginate(page, rows.length, query.page, query.limit);
  }

  /**
   * Admin moderation of a listing (approve / reject before it goes live).
   *
   * The marketplace is a deliberate stub: listings are in-memory fixtures with no
   * database row, and every listing write already returns 501 rather than
   * silently pretending to persist. Moderation follows the same rule — the
   * listing is checked to exist, then an honest 501 is returned. The route, the
   * DTO and this behaviour are final; wiring real moderation is part of building
   * the real marketplace.
   */
  async adminModerate(id: string, action: 'approve' | 'reject'): Promise<never> {
    await this.findOne(id);
    this.logger.log(`[STUB] Admin ${action} on listing ${id}`);
    throw new NotImplementedException(
      `Listing ${action} is not implemented in this build. The marketplace is a stub — ` +
        'listings are sample data with no database row. This route and its response are final; ' +
        'real moderation lands with the real marketplace (seller verification, payouts, review queue).',
    );
  }

  async findOne(id: string): Promise<ListingResponseDto> {
    const listing = MarketplaceService.MOCK_LISTINGS.find((candidate) => candidate.id === id);
    if (!listing) {
      throw new NotFoundException(
        'Listing not found. The marketplace is a stub in this build — only the sample listings from GET /marketplace/listings exist.',
      );
    }
    return listing;
  }

  /**
   * Starts a purchase.
   *
   * No money moves. What this genuinely does is create a real `Transaction` row
   * and take it through the `PaymentProvider` interface, so the whole path —
   * route, DTO, transaction record, provider call, response shape — is exercised
   * and final. Replacing `MockPaymentProvider` with a real one turns this into a
   * working purchase without touching this method.
   */
  async purchase(
    buyerId: string,
    listingId: string,
    dto: PurchaseListingDto,
  ): Promise<PurchaseResponseDto> {
    const listing = await this.findOne(listingId);
    this.logger.log(`[STUB] Purchase attempt: user ${buyerId} -> listing ${listingId}`);

    return this.payments.startCheckout({
      buyerId,
      listingId: listing.id,
      listingTitle: listing.title,
      amount: listing.price,
      currency: listing.currency,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
    });
  }
}
