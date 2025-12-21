import { notFound } from "next/navigation";
import { getProjectById } from "@/app/actions";
import { ProjectHeader } from "@/components/projects/project-header";
import { FileUploadSection } from "@/components/projects/file-upload-section";
import { DocumentList } from "@/components/projects/document-list";
import { KnowledgeBaseSection } from "@/components/projects/knowledge-base-section";

interface ProjectDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    notFound();
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <ProjectHeader project={project} />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Documents */}
        <div className="lg:col-span-2 space-y-6">
          <FileUploadSection projectId={project.id} />
          <DocumentList projectId={project.id} documents={project.assets} />
        </div>

        {/* Right Column: Knowledge Base */}
        <div className="lg:col-span-1">
          <KnowledgeBaseSection project={project} />
        </div>
      </div>
    </div>
  );
}
