import { getProjects } from "@/app/actions";
import { ProjectCard } from "@/components/projects/project-card";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">我的项目</h1>
          <p className="text-muted-foreground mt-1">
            管理你的项目和文档，生成 AI 知识库
          </p>
        </div>
        <CreateProjectDialog>
          <Button size="lg">
            <PlusIcon className="w-4 h-4 mr-2" />
            新建项目
          </Button>
        </CreateProjectDialog>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
            <PlusIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">暂无项目</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            创建你的第一个项目，上传文档并生成 AI 知识库
          </p>
          <CreateProjectDialog>
            <Button>
              <PlusIcon className="w-4 h-4 mr-2" />
              创建项目
            </Button>
          </CreateProjectDialog>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
