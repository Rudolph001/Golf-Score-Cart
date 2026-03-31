import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Wifi, WifiOff, Lock, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";

interface WifiNetwork {
  ssid: string;
  signal: number;
  secured: boolean;
}

interface WifiStatusResponse {
  ssid: string | null;
}

interface WifiNetworksResponse {
  networks: WifiNetwork[];
}

interface WifiConnectResponse {
  success?: boolean;
  ssid?: string;
  error?: string;
}

async function fetchWifiStatus(): Promise<WifiStatusResponse> {
  const res = await fetch("/api/wifi/status");
  if (!res.ok) throw new Error("Failed to fetch WiFi status");
  return res.json();
}

async function fetchWifiNetworks(): Promise<WifiNetworksResponse> {
  const res = await fetch("/api/wifi/networks");
  if (!res.ok) throw new Error("Failed to scan networks");
  return res.json();
}

async function connectToNetwork(ssid: string, password: string): Promise<WifiConnectResponse> {
  const res = await fetch("/api/wifi/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ssid, password }),
  });
  return res.json();
}

function SignalBars({ signal }: { signal: number }) {
  const bars = signal >= 75 ? 4 : signal >= 50 ? 3 : signal >= 25 ? 2 : 1;
  return (
    <div className="flex items-end gap-0.5 h-4">
      {[1, 2, 3, 4].map((b) => (
        <div
          key={b}
          className={`w-1.5 rounded-sm ${b <= bars ? "bg-primary" : "bg-muted"}`}
          style={{ height: `${b * 25}%` }}
        />
      ))}
    </div>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const [selectedNetwork, setSelectedNetwork] = useState<WifiNetwork | null>(null);
  const [password, setPassword] = useState("");
  const [connecting, setConnecting] = useState(false);

  const statusQuery = useQuery({
    queryKey: ["wifi-status"],
    queryFn: fetchWifiStatus,
    refetchInterval: 10000,
  });

  const networksQuery = useQuery({
    queryKey: ["wifi-networks"],
    queryFn: fetchWifiNetworks,
    staleTime: 30000,
  });

  const connectMutation = useMutation({
    mutationFn: ({ ssid, password }: { ssid: string; password: string }) =>
      connectToNetwork(ssid, password),
    onSuccess: (data) => {
      setConnecting(false);
      if (data.success) {
        toast({ title: "Connected", description: `Connected to ${data.ssid}` });
        setSelectedNetwork(null);
        setPassword("");
        statusQuery.refetch();
        networksQuery.refetch();
      } else {
        toast({
          title: "Connection failed",
          description: data.error ?? "Could not connect. Check the password.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      setConnecting(false);
      toast({
        title: "Connection failed",
        description: "Could not reach the Pi. Try again.",
        variant: "destructive",
      });
    },
  });

  function handleConnect() {
    if (!selectedNetwork) return;
    setConnecting(true);
    connectMutation.mutate({ ssid: selectedNetwork.ssid, password });
  }

  const currentSsid = statusQuery.data?.ssid ?? null;
  const networks = networksQuery.data?.networks ?? [];

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-4">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Current WiFi status */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Current Connection
          </h2>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              {currentSsid ? (
                <>
                  <div className="p-2 bg-green-100 rounded-full">
                    <Wifi className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold">{currentSsid}</p>
                    <p className="text-xs text-muted-foreground">Connected</p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />
                </>
              ) : (
                <>
                  <div className="p-2 bg-muted rounded-full">
                    <WifiOff className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-muted-foreground">Not connected</p>
                    <p className="text-xs text-muted-foreground">Select a network below</p>
                  </div>
                  <AlertCircle className="w-5 h-5 text-orange-400 ml-auto" />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Network list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Available Networks
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => networksQuery.refetch()}
              disabled={networksQuery.isFetching}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${networksQuery.isFetching ? "animate-spin" : ""}`} />
              Scan
            </Button>
          </div>

          {networksQuery.isLoading && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Scanning for networks...
            </div>
          )}

          {networksQuery.isError && (
            <Card>
              <CardContent className="p-4 text-sm text-destructive">
                Could not scan for networks. Make sure you are running on the Pi.
              </CardContent>
            </Card>
          )}

          {networks.length > 0 && (
            <div className="space-y-2">
              {networks.map((network) => (
                <Card
                  key={network.ssid}
                  className={`cursor-pointer transition-all hover:border-primary/50 active:scale-[0.99] ${
                    network.ssid === currentSsid ? "border-green-400 bg-green-50/50" : ""
                  }`}
                  onClick={() => {
                    setSelectedNetwork(network);
                    setPassword("");
                  }}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <SignalBars signal={network.signal} />
                    <span className="flex-1 font-medium">{network.ssid}</span>
                    {network.secured && (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    )}
                    {network.ssid === currentSsid && (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Password dialog */}
      <AlertDialog
        open={selectedNetwork !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedNetwork(null);
            setPassword("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5" />
              Connect to {selectedNetwork?.ssid}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedNetwork?.secured
                ? "Enter the WiFi password to connect."
                : "This is an open network. No password needed."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {selectedNetwork?.secured && (
            <Input
              type="password"
              placeholder="WiFi password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              autoFocus
              className="mt-2"
            />
          )}

          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel disabled={connecting}>Cancel</AlertDialogCancel>
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? "Connecting..." : "Connect"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Navigation />
    </div>
  );
}
