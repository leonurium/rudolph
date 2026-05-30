import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('notion_chunks', { schema: 'public' })
export class NotionChunk {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId!: string;

  @Column({ name: 'chunk_text', type: 'text' })
  chunkText!: string;

  @Column({ type: 'varchar', nullable: true })
  embedding!: string | null;

  @Column({ name: 'chunk_index', type: 'integer' })
  chunkIndex!: number;

  @Column({ name: 'content_hash', type: 'text', nullable: true })
  contentHash!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
