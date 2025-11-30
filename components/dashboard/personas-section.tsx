"use client";

import { useDashboard } from "@/components/providers/dashboard-provider";
import { PersonaCard } from "./persona-card";
import { PersonaForm } from "./persona-form";

export function PersonasSection() {
  const { snapshot } = useDashboard();

  return (
    <section>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-xl font-bold">常用 KOS 人设</h3>
        {snapshot.personas.length > 0 && <PersonaForm compact />}
      </div>
      {snapshot.personas.length === 0 ? (
        <PersonaForm />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {snapshot.personas.map((persona) => (
              <PersonaCard key={persona.id || persona.name} persona={persona} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

