import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UrlMetadataService } from './url-metadata.service';

/**
 * `assertFetchable` is the only thing standing between `/assets/from-url` and an
 * SSRF probe into whatever network this API runs in, so its refusals are worth
 * pinning down. Literal IPs are used throughout: they take the branch that needs
 * no DNS, which keeps these tests offline.
 */
describe('UrlMetadataService.assertFetchable', () => {
  const service = new UrlMetadataService(new ConfigService());

  const rejects = (url: string) =>
    expect(service.assertFetchable(url)).rejects.toBeInstanceOf(BadRequestException);

  it('rejects non-HTTP schemes', async () => {
    await rejects('file:///etc/passwd');
    await rejects('ftp://example.com/file.zip');
    await rejects('javascript:alert(1)');
  });

  it('rejects loopback', async () => {
    await rejects('http://127.0.0.1:5432/');
    await rejects('http://127.4.5.6/');
    await rejects('http://[::1]/');
  });

  it('rejects private ranges', async () => {
    await rejects('http://10.0.0.5/');
    await rejects('http://192.168.1.1/admin');
    await rejects('http://172.16.0.1/');
    await rejects('http://172.31.255.254/');
  });

  it('rejects the cloud metadata endpoint', async () => {
    // The single most valuable SSRF target on a hosted deployment.
    await rejects('http://169.254.169.254/latest/meta-data/');
  });

  it('rejects carrier-grade NAT and multicast', async () => {
    await rejects('http://100.64.0.1/');
    await rejects('http://224.0.0.1/');
  });

  it('allows a public address', async () => {
    await expect(service.assertFetchable('https://93.184.216.34/page')).resolves.toBeInstanceOf(
      URL,
    );
  });

  it('allows a public range that neighbours a private one', async () => {
    // 172.15 and 172.32 sit just outside the 172.16–172.31 private block.
    await expect(service.assertFetchable('http://172.15.0.1/')).resolves.toBeInstanceOf(URL);
    await expect(service.assertFetchable('http://172.32.0.1/')).resolves.toBeInstanceOf(URL);
  });

  it('rejects a malformed URL', async () => {
    await rejects('not a url');
  });
});
