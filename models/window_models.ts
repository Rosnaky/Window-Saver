interface TabInfo {
    id: number;
    title: string;
    url: string;
}

interface WindowInfo {
    windowId: number;
    tabs: TabInfo[];
}

interface WindowCluster {
    windowClusterId: number;
    windows: WindowInfo[];
    windowClusterName: string;
}