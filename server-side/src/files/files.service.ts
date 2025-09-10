import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { FilesRepository } from './files.repository';
import { R2Service } from 'src/r2/r2.service';
import { CustomUser } from 'src/auth/auth.guard';

interface CreateFile {
  user: CustomUser;
  buffer: Buffer;
  name: string;
  path: string;
  type: string;
  size: number;
  is_public: boolean;
  file_type: 'rents' | 'customers' | 'organization';
  ids: {
    customerId?: string;
    rentsId?: string;
  };
}

@Injectable()
export class FilesService {
  constructor(
    @Inject(FilesRepository) private filesRepository: FilesRepository,
    @Inject(R2Service) private r2Service: R2Service,
  ) {}

  async create(body: CreateFile) {
    let publicURL = 'https://pub-ba7b65fffa9941c699f126a3d4c18486.r2.dev';
    const filePath = this.getFilePATH(
      body.user.org_id,
      body.file_type,
      body.ids,
    );
    const ext = `${filePath}/${body.name}`;

    await this.r2Service.put(ext, body.buffer);
    const link = body.is_public
      ? `${publicURL}/${ext}?updatedAt=${new Date().getTime().toString()}`
      : null;

    const res = await this.filesRepository.create({
      name: body.name,
      path: ext,
      type: body.type,
      size: body.size,
      url: link,
      isPublic: body.is_public,
      orgId: body.user.org_id,
      createdBy: body.user.id,
    });

    return res;
  }

  async findAll(user: CustomUser) {
    const res = await this.filesRepository.findAll(user.org_id);
    return res;
  }

  async findOne(id: string) {
    const file = await this.filesRepository.findOne(id);

    if (!file) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }
    const url = await this.r2Service.getSignedUrl(file.path);

    return {
      ...file,
      url: url,
    };
  }

  async delete(id: string) {
    const file = await this.filesRepository.findOne(id);

    if (!file) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    await this.filesRepository.delete(id);

    await this.r2Service.delete(file.path);

    return {
      success: true,
    };
  }

  private getFilePATH(
    org_id: string,
    file_type: 'rents' | 'customers' | 'organization',
    ids: {
      customerId?: string;
      rentsId?: string;
    },
  ) {
    if (file_type === 'rents' && ids.rentsId) {
      return `${org_id}/rent/${ids.rentsId}`;
    }
    if (file_type === 'customers' && ids.customerId) {
      return `${org_id}/customers/${ids.customerId}`;
    }

    return `${org_id}/${file_type}`;
  }
}
