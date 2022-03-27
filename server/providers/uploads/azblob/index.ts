/* eslint-disable-next-line @typescript-eslint/no-unused-vars -- https://stackoverflow.com/a/63798664 */
import { Provider } from '../../../uploads/provider'
import { DefaultAzureCredential } from '@azure/identity'
import { ContainerClient } from '@azure/storage-blob'
import crypto from 'crypto'

interface AzblobProviderOptions {
  containerUrl: string;
}

export default class AzblobProvider implements Provider {
  private client: ContainerClient

  constructor (_options: Partial<AzblobProviderOptions>) {
    if (!_options.containerUrl) throw new Error('Upload provider azblob requires option: containerUrl')

    // Supports many providers including managed identities and
    // * AZURE_TENANT_ID
    // * AZURE_CLIENT_ID
    // * AZURE_CLIENT_SECRET || AZURE_CLIENT_CERTIFICATE_PATH
    this.client = new ContainerClient(_options.containerUrl, new DefaultAzureCredential())
  }

  async upload (data: Buffer, name: string): Promise<string> {
    const blob = this.client.getBlockBlobClient(name)
    if (await blob.exists()) {
      const oldHash = (await blob.getProperties()).contentMD5

      // upload if hash is undefined, even if blob exists
      if (oldHash !== undefined) {
        const newHash = crypto.createHash('md5').update(data).digest()
        if (Buffer.compare(oldHash, newHash) === 0) return blob.url
      }
    }

    await blob.uploadData(data, {
      blobHTTPHeaders: {
        blobContentDisposition: 'download'
      }
    })

    return blob.url
  }

  async getUrl (_: string, name: string): Promise<string|null> {
    const blob = this.client.getBlockBlobClient(name)
    return await blob.exists() ? blob.url : null
  }
}
