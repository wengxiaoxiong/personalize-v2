"use client";

import { useDashboard } from "@/components/providers/dashboard-provider";
import { PersonaCard } from "./persona-card";

export function PersonasSection() {
  const { snapshot } = useDashboard();

  return (
    <section>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-xl font-bold">常用 KOS 人设</h3>
      </div>
      {snapshot.personas.length === 0 ? (
        <div className="text-gray-500">暂无人设</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {snapshot.personas.map((persona) => (
            <PersonaCard
              key={persona.id || persona.name}
              persona={persona}
              onEdit={() => console.log("编辑:", persona.name)}
              onCopy={() => console.log("复制:", persona.name)}
              onDelete={() => console.log("删除:", persona.name)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

