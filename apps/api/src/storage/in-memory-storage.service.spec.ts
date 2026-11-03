import { storageContract } from '../testing/storage.contract.ts';
import { InMemoryStorageService } from './in-memory-storage.service.ts';

storageContract('memory', () => new InMemoryStorageService());
