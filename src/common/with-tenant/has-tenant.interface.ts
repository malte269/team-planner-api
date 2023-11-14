import { Tenant } from '../../models/tenant/tenant.entity';

export interface HasTenant {
  tenant?: Tenant | null;
  tenantId?: string | null;
}
