"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { orpc } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function Home() {
  const queryClient = useQueryClient();
  const [itemId, setItemId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLimit, setSearchLimit] = useState(5);

  // Health check
  const healthCheck = useQuery(orpc.healthCheck.queryOptions());

  // Plugin ping
  const pluginPing = useQuery(orpc.template.ping.queryOptions());

  // Item lookup
  const itemQuery = useQuery({
    ...orpc.template.getById.queryOptions({ input: { id: itemId } }),
    enabled: !!itemId,
  });

  // Search results
  const searchResults = useQuery({
    ...orpc.template.search.queryOptions({
      input: {
        query: searchQuery,
        limit: searchLimit,
      },
    }),
    enabled: !!searchQuery,
  });

  const handleItemLookup = () => {
    if (itemId.trim()) {
      queryClient.invalidateQueries({
        queryKey: orpc.template.getById.queryKey({ input: { id: itemId } }),
      });
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      queryClient.invalidateQueries({
        queryKey: orpc.template.search.queryKey({
          input: {
            query: searchQuery,
            limit: searchLimit,
          },
        }),
      });
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="grid gap-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">Plugin Builder Demo</h1>
          <p className="text-muted-foreground mt-2">
            Demonstrating the template plugin integration
          </p>
        </div>

        {/* API Status */}
        <Card>
          <CardHeader>
            <CardTitle>API Status</CardTitle>
            <CardDescription>
              Connection status for both the main API and template plugin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  healthCheck.data ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-sm">
                Main API:{" "}
                {healthCheck.isLoading
                  ? "Checking..."
                  : healthCheck.data
                  ? "Connected"
                  : "Disconnected"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  pluginPing.data?.status === "ok"
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              />
              <span className="text-sm">
                Template Plugin:{" "}
                {pluginPing.isLoading
                  ? "Checking..."
                  : pluginPing.data?.status === "ok"
                  ? "Connected"
                  : "Disconnected"}
              </span>
            </div>
            {pluginPing.data?.timestamp && (
              <p className="text-xs text-muted-foreground">
                Last ping:{" "}
                {new Date(pluginPing.data.timestamp).toLocaleTimeString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Item Lookup */}
        <Card>
          <CardHeader>
            <CardTitle>Item Lookup</CardTitle>
            <CardDescription>
              Fetch a single item by ID using the template plugin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="itemId">Item ID</Label>
                <Input
                  id="itemId"
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                  placeholder="Enter item ID (e.g., item-123)"
                />
              </div>
              <Button onClick={handleItemLookup} disabled={!itemId.trim()}>
                Lookup
              </Button>
            </div>

            {itemQuery.isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            )}

            {itemQuery.data?.item && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium">{itemQuery.data.item.title}</h4>
                <p className="text-sm text-muted-foreground">
                  ID: {itemQuery.data.item.id}
                </p>
                <p className="text-xs text-muted-foreground">
                  Created:{" "}
                  {new Date(itemQuery.data.item.createdAt).toLocaleString()}
                </p>
              </div>
            )}

            {itemQuery.error && (
              <p className="text-sm text-destructive">
                Error: {itemQuery.error.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Streaming Search</CardTitle>
            <CardDescription>
              Search for items with real-time streaming results
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <Label htmlFor="searchQuery">Search Query</Label>
                <Input
                  id="searchQuery"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter search term"
                />
              </div>
              <div>
                <Label htmlFor="searchLimit">Limit</Label>
                <Input
                  id="searchLimit"
                  type="number"
                  min="1"
                  max="20"
                  value={searchLimit}
                  onChange={(e) => setSearchLimit(Number(e.target.value))}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSearch} disabled={!searchQuery.trim()}>
                  Search
                </Button>
              </div>
            </div>

            {searchResults.isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            )}

            {searchResults.data && (
              <div className="space-y-2">
                {searchResults.data?.map((result, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{result.item.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          ID: {result.item.id}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium">
                          Score: {result.score.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchResults.error && (
              <p className="text-sm text-destructive">
                Error: {searchResults.error.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Background Events (Optional) */}
        <Card>
          <CardHeader>
            <CardTitle>Background Events</CardTitle>
            <CardDescription>
              Listen to background events from the plugin (when enabled)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => {
                toast.info("Background events feature coming soon!");
              }}
            >
              Start Listening
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
