import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notion_documents', { schema: 'public' })
export class NotionDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notion_page_id', type: 'text' })
  notionPageId: string;

  @Column({ name: 'notion_database_id', type: 'text' })
  notionDatabaseId: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text' })
  url: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
