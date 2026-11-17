/**
 * Content for the landing page. Every figure here is taken from the site's own
 * docs (guide/benchmarks, guide/how-it-works, guide/memory, features/share) so
 * the homepage and the documentation never disagree.
 */

export const DOWNLOAD_URL = "https://runkiri.com/download/";
export const RELEASES_URL = "https://runkiri.com/releases/";
export const REPO_URL = "https://github.com/libracoder/kiri";

/** `docker run --rm alpine true`, bridge networking, p50 of 30 runs. */
export type RacePath = "cli" | "api";

export interface RaceEngine {
  id: string;
  name: string;
  tone: "kiri" | "dd" | "orb";
  ms: Record<RacePath, number>;
  stops: Record<RacePath, string[]>;
  note: string;
  /** Processes left resident for every running container. */
  residue: number;
}

export const raceEngines: RaceEngine[] = [
  {
    id: "orb",
    name: "OrbStack",
    tone: "orb",
    ms: { cli: 442, api: 380 },
    stops: {
      cli: ["docker CLI", "dockerd", "containerd", "shim", "runc", "容器"],
      api: ["Engine API", "dockerd", "containerd", "shim", "runc", "容器"],
    },
    note: "五跳。每个运行中的容器都会留下一个常驻 shim 进程。",
    residue: 1,
  },
  {
    id: "dd",
    name: "Docker Desktop",
    tone: "dd",
    ms: { cli: 243, api: 213 },
    stops: {
      cli: ["docker CLI", "dockerd", "containerd", "shim", "runc", "容器"],
      api: ["Engine API", "dockerd", "containerd", "shim", "runc", "容器"],
    },
    note: "同样的五跳，同样为每个容器保留一个 shim。",
    residue: 1,
  },
  {
    id: "kiri",
    name: "Kiri",
    tone: "kiri",
    ms: { cli: 14.2, api: 2.55 },
    stops: {
      cli: ["docker CLI", "kiri 守护进程", "vsock", "kiri-init", "容器"],
      api: ["Engine API", "kiri 守护进程", "vsock", "kiri-init", "容器"],
    },
    note: "一条守护进程 + 一个代理，代理自己 clone3 出命名空间、cgroup 与挂载。没有每容器残留进程。",
    residue: 0,
  },
];

export const raceCommand: Record<RacePath, string> = {
  cli: "docker run --rm alpine true",
  api: "POST /containers/create → start → wait → remove",
};

export const tools = [
  "docker",
  "docker compose",
  "docker buildx",
  "Docker Engine API",
  "Docker Hub",
  "OCI images",
  "ghcr.io",
  "Dockerfiles",
];

export interface Feature {
  icon: string;
  title: string;
  desc: string;
  href: string;
  tone?: "rose" | "teal" | "orchid";
}

export const features: Feature[] = [
  {
    icon: "ph:cube",
    title: "容器与 Compose",
    desc: "你常用的每一条 docker 命令都能用。Compose 项目在窗口里按项目分组，每个容器都有独立页面：实时日志、终端与文件。",
    href: "/docker/containers/",
  },
  {
    icon: "ph:package",
    title: "来自 Docker Hub 的镜像",
    desc: "在窗口里搜索 Docker Hub，逐层查看拉取进度。分层按内容寻址去重，amd64 镜像通过 Rosetta 运行。",
    href: "/docker/images/",
  },
  {
    icon: "ph:hammer",
    title: "BuildKit 构建",
    desc: "docker build 与 buildx 走 BuildKit，构建结果直接载入 Kiri 的镜像存储；空闲时构建组件可以停下来。",
    href: "/docker/builds/",
  },
  {
    icon: "ph:hexagon",
    title: "Kubernetes",
    desc: "kiri k8s start 给你一个单节点 k3s 集群，Pod 与 Service 直接在窗口中查看，kind 也能运行。",
    href: "/guide/kubernetes/",
  },
  {
    icon: "ph:hard-drives",
    title: "Linux 机器",
    desc: "kiri machine create dev --distro ubuntu：你的用户、sudo，以及相同路径下的本机文件夹。",
    href: "/guide/machines/",
  },
  {
    icon: "ph:cloud-arrow-up",
    title: "Kiri Share",
    desc: "为本地端口或容器生成公网 HTTPS 地址，随时断开；同一账号在多台电脑上统一管理。",
    href: "/features/share/",
    tone: "rose",
  },
  {
    icon: "ph:globe",
    title: "域名与 HTTPS",
    desc: "web.kiri.localhost 免配置可用，Compose 服务是 api.myapp.kiri.local，HTTPS 由 Kiri 自带的本地 CA 签发。",
    href: "/features/domains/",
    tone: "teal",
  },
  {
    icon: "ph:feather",
    title: "对电脑足够轻",
    desc: "内存气球贴近实际用量，无容器运行约 60 秒后 VM 休眠；守护进程约 15 MB，唤醒约 0.15 秒。",
    href: "/guide/memory/",
  },
  {
    icon: "ph:arrows-left-right",
    title: "一次性迁移",
    desc: "kiri import 从 OrbStack 或 Docker Desktop 带来镜像、卷与容器，源侧只读；再用 docker context use kiri 切换。",
    href: "/docker/migrate/",
    tone: "orchid",
  },
];

/** The window and the setup wizard ship in these 38 languages. */
export const languages = [
  "简体中文",
  "繁體中文",
  "日本語",
  "한국어",
  "English",
  "Bahasa Indonesia",
  "Català",
  "Čeština",
  "Deutsch",
  "Español",
  "Français",
  "Italiano",
  "Lietuvių",
  "Magyar",
  "Norsk bokmål",
  "Polski",
  "Português (Brasil)",
  "Română",
  "Shqip",
  "Slovenščina",
  "Suomi",
  "Türkçe",
  "Tiếng Việt",
  "Ελληνικά",
  "Български",
  "Русский",
  "Українська",
  "Қазақша",
  "العربية",
  "فارسی",
  "کوردیی ناوەندی",
  "हिन्दी",
  "తెలుగు",
  "தமிழ்",
  "বাংলা",
  "አማርኛ",
  "ไทย",
  "ລາວ",
];

export interface TermLine {
  cmd: string;
  out: { text: string; tone?: "ok" | "dim" | "brand" }[];
}

export const termSession: TermLine[] = [
  {
    cmd: 'kiri run --rm alpine echo "kiri"',
    out: [{ text: "kiri", tone: "ok" }],
  },
  {
    cmd: "kiri run -d --name web -p 8080:80 nginx",
    out: [{ text: "3f9c1a2b7d8e", tone: "dim" }],
  },
  {
    cmd: "kiri ps",
    out: [
      { text: "NAME   IMAGE          STATUS", tone: "dim" },
      { text: "web    nginx:alpine   Up 2 seconds", tone: "ok" },
    ],
  },
  {
    cmd: "curl http://web.kiri.localhost",
    out: [{ text: "<!DOCTYPE html> …  按名字访问，不用记端口", tone: "dim" }],
  },
  {
    cmd: "kiri share web",
    out: [{ text: "https://web.runkiri.cloud", tone: "brand" }],
  },
];

export const cliPoints = [
  {
    icon: "ph:terminal",
    lead: "kiri run、kiri ps",
    rest: "与对应的 docker 命令行为一致，并且始终指向 Kiri，不受当前 context 影响。",
  },
  {
    icon: "ph:globe",
    lead: "web.kiri.localhost",
    rest: "按名字访问容器，无需额外配置，也不用记端口。",
  },
  {
    icon: "ph:hexagon",
    lead: "kiri k8s start / kiri machine create",
    rest: "一条命令给你一个集群，或一台长期存在的 Linux 机器。",
  },
  {
    icon: "ph:cloud-arrow-up",
    lead: "kiri share web",
    rest: "把它放上互联网，得到一个公网 HTTPS 地址。",
  },
];

export const steps = [
  {
    n: "01",
    title: "安装",
    desc: "下载安装包，把 Kiri 拖进「应用程序」。它会创建 kiri context，并把 docker、Compose 与 buildx 准备好。",
    code: "curl -fsSL https://runkiri.com/install.sh | bash",
    cta: { label: "下载安装包", href: DOWNLOAD_URL, external: true },
  },
  {
    n: "02",
    title: "拉取镜像",
    desc: "在「镜像」里搜索 Docker Hub 并点击拉取，或者在终端里：",
    code: "docker pull nginx",
  },
  {
    n: "03",
    title: "运行容器",
    desc: "点击「运行」并给它一个端口，毫秒级启动。命令行同样可以：",
    code: "docker run -d --name web -p 8080:80 nginx",
  },
  {
    n: "04",
    title: "分享出去",
    desc: "登录后在容器上点击 Share，或者用命令拿到公网链接：",
    code: "kiri share web",
  },
];

export type PlatformId = "mac" | "win" | "linux";

export interface Platform {
  id: PlatformId;
  name: string;
  icon: string;
  channel: string;
  guest: string;
  guestNote: string;
  badge: string;
  desc: string;
  href: string;
}

export const platforms: Platform[] = [
  {
    id: "mac",
    name: "macOS",
    icon: "ph:apple-logo",
    channel: "vsock",
    guest: "精简 Linux VM",
    guestNote: "Virtualization.framework · 自定义内核 · kiri-init 作为 PID 1",
    badge: "macOS 14+ · Apple silicon / Intel",
    desc: "一个最小 Linux VM，由 Virtualization.framework 启动；空闲约 60 秒后休眠并归还内存。",
    href: "/guide/how-it-works/",
  },
  {
    id: "win",
    name: "Windows",
    icon: "ph:windows-logo",
    channel: "命名管道",
    guest: "WSL2 发行版",
    guestNote: "\\\\.\\pipe\\kiri 提供 Docker API · 引擎运行在 WSL2 中",
    badge: "Windows 10 / 11 · x64 / ARM · Beta",
    desc: "引擎运行在 WSL2 里，Docker API 通过命名管道提供，窗口与菜单栏照常可用。",
    href: "/platforms/windows/",
  },
  {
    id: "linux",
    name: "Linux",
    icon: "ph:linux-logo",
    channel: "Unix socket",
    guest: "宿主机内核",
    guestNote: "没有 VM：守护进程与代理直接在你的内核上 clone3",
    badge: "Ubuntu / Fedora 等 · systemd · .deb / .rpm",
    desc: "原生运行，没有虚拟机。由 systemd 管理 kiri.service，隔离机制与 Mac 上一致。",
    href: "/platforms/linux/",
  },
];

export const howStats = [
  { value: "~0.1", unit: "秒", label: "冷启动即就绪", desc: "一次启动服务所有容器，之后只有 VM 按需开关机。" },
  { value: "~0.15", unit: "秒", label: "从休眠中唤醒", desc: "空闲约 60 秒后 VM 断电，下一条命令把它叫回来。" },
  { value: "0", unit: "个", label: "每容器残留进程", desc: "没有 shim，也没有 runc：容器退出后什么都不留下。" },
];

export const navLinks = [
  { href: "#features", label: "能力" },
  { href: "#race", label: "实测" },
  { href: "#resource", label: "资源" },
  { href: "#how", label: "原理" },
  { href: "#start", label: "上手" },
];
/**
 * The footer's install manifest. Commands and package formats are the ones
 * documented in src/content/docs/install.mdx — Windows has no shell installer,
 * so its line is the check you run once the .msi has finished.
 */
export interface InstallTarget {
  id: PlatformId;
  name: string;
  icon: string;
  label: string;
  cmd: string;
  pkg: string;
  note: string;
}

export const installTargets: InstallTarget[] = [
  {
    id: "mac",
    name: "macOS",
    icon: "ph:apple-logo",
    label: "安装脚本",
    cmd: "curl -fsSL https://runkiri.com/install.sh | bash",
    pkg: ".dmg · macOS 14+ · Apple silicon / Intel",
    note: "脚本会校验下载内容再安装。也可以直接下载 .dmg，把 Kiri 拖进「应用程序」。",
  },
  {
    id: "win",
    name: "Windows",
    icon: "ph:windows-logo",
    label: "装好后验证",
    cmd: "docker --context kiri run --rm hello-world",
    pkg: ".msi · Windows 10 / 11 · x64 / ARM · Beta",
    note: "运行 .msi 安装程序，Kiri 会按需引导设置 WSL2，并配好 docker CLI 与 kiri context。",
  },
  {
    id: "linux",
    name: "Linux",
    icon: "ph:linux-logo",
    label: "仅装引擎",
    cmd: "curl -fsSL https://runkiri.com/install.sh | KIRI_LITE=1 bash",
    pkg: ".deb / .rpm · systemd · x86-64 / ARM",
    note: "KIRI_LITE=1 只装引擎。去掉它，docker、Compose 与 buildx 会一起装好。",
  },
];
