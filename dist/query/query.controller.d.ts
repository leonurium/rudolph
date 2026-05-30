import { Response } from 'express';
import { QueryService } from './query.service';
interface QueryDto {
    question: string;
    project_id?: string;
    top_k?: number;
    threshold?: number;
    system_prompt?: string;
}
export declare class QueryController {
    private readonly queryService;
    private readonly logger;
    constructor(queryService: QueryService);
    query(body: QueryDto, res: Response): Promise<void>;
}
export {};
