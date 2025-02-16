interface TabInfo {
    id: number;
    title: string;
    url: string;
}

interface WindowInfo {
    windowId: number;
    tabs: TabInfo[];
    windowName: string;
}

interface WindowCluster {
    windowClusterId: number;
    windows: WindowInfo[];
    clusterName: string;
}