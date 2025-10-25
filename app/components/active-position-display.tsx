import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { BarChart3, Loader } from "lucide-react";

interface ActivePositionDisplayProps {
  count: number;
  isLoading?: boolean;
}

export const ActivePositionDisplay = React.memo(function ActivePositionDisplay({
  count,
  isLoading = false,
}: ActivePositionDisplayProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">현재 포지션</CardTitle>
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <div className="text-2xl font-bold">
            {isLoading ? (
              <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : (
              count
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
