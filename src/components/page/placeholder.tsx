import { Icon, type IconName } from "@/components/ui/icon";
import { PageHeader } from "./page-header";

export interface PlaceholderPageProps {
  title: string;
  subtitle: string;
  icon: IconName;
}

export function PlaceholderPage({ title, subtitle, icon }: PlaceholderPageProps) {
  return (
    <div className="p-10">
      <PageHeader title={title} subtitle={subtitle} />
      <div className="bg-white border border-dashed border-graphite-300 rounded-xl p-20 text-center">
        <div className="inline-flex w-14 h-14 rounded-full bg-blue-50 items-center justify-center text-blue-600 mb-4">
          <Icon name={icon} size={24} />
        </div>
        <div className="text-base font-semibold mb-2">Módulo en fase 2</div>
        <p className="text-sm text-graphite-500 max-w-sm mx-auto">{subtitle}</p>
      </div>
    </div>
  );
}
