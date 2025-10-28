import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Search, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PropertyReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName: string;
}

export function PropertyReportsModal({
  isOpen,
  onClose,
  propertyId,
  propertyName,
}: PropertyReportsModalProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("supplies");

  // Fetch property supplies
  const { data: supplies = [], isLoading } = useQuery({
    queryKey: [`/api/properties/${propertyId}/supplies-report`],
    enabled: isOpen && !!propertyId,
  });

  // Filter supplies by search query across all fields
  const filteredSupplies = Array.isArray(supplies)
    ? supplies.filter((supply: any) => {
        const query = searchQuery.toLowerCase();
        return (
          supply.name?.toLowerCase().includes(query) ||
          supply.roomName?.toLowerCase().includes(query) ||
          supply.roomType?.toLowerCase().includes(query) ||
          supply.type?.toLowerCase().includes(query) ||
          supply.brand?.toLowerCase().includes(query) ||
          supply.model?.toLowerCase().includes(query) ||
          supply.location?.toLowerCase().includes(query) ||
          supply.unit?.toLowerCase().includes(query) ||
          supply.notes?.toLowerCase().includes(query) ||
          supply.purchaseUrl?.toLowerCase().includes(query) ||
          supply.quantity?.toString().includes(query) ||
          supply.lastChanged?.toString().includes(query) ||
          supply.nextReplacement?.toString().includes(query)
        );
      })
    : [];

  // Group supplies by room
  const suppliesByRoom = filteredSupplies.reduce((acc: any, supply: any) => {
    const roomName = supply.roomName || "Unassigned";
    if (!acc[roomName]) {
      acc[roomName] = [];
    }
    acc[roomName].push(supply);
    return acc;
  }, {});

  // Export to CSV
  const exportToCSV = () => {
    if (filteredSupplies.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no supplies to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "Room",
      "Supply Name",
      "Type",
      "Brand",
      "Model",
      "Quantity",
      "Unit",
      "Location",
      "Last Changed",
      "Next Replacement",
      "Notes",
    ];

    const rows = filteredSupplies.map((supply: any) => [
      supply.roomName || "",
      supply.name || "",
      supply.type || "",
      supply.brand || "",
      supply.model || "",
      supply.quantity || "",
      supply.unit || "",
      supply.location || "",
      supply.lastChanged || "",
      supply.nextReplacement || "",
      supply.notes || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row: any[]) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${propertyName.replace(/[^a-z0-9]/gi, "_")}_supplies_report.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Report exported",
      description: "CSV file has been downloaded successfully.",
    });
  };

  const getTypeColor = (type: string) => {
    const typeMap: { [key: string]: string } = {
      lightbulb: "bg-yellow-100 text-yellow-800",
      filter: "bg-blue-100 text-blue-800",
      paint: "bg-purple-100 text-purple-800",
      battery: "bg-green-100 text-green-800",
      cleaning: "bg-cyan-100 text-cyan-800",
      hardware: "bg-gray-100 text-gray-800",
      electrical: "bg-orange-100 text-orange-800",
      plumbing: "bg-indigo-100 text-indigo-800",
      hvac: "bg-red-100 text-red-800",
    };
    return typeMap[type] || "bg-slate-100 text-slate-800";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Property Reports - {propertyName}</DialogTitle>
          <DialogDescription>
            View and export detailed reports for this property
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList>
            <TabsTrigger value="supplies">
              <FileText className="w-4 h-4 mr-2" />
              Supplies Report
            </TabsTrigger>
          </TabsList>

          <TabsContent value="supplies" className="flex-1 flex flex-col overflow-hidden mt-4">
            {/* Search and Export Controls */}
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search supplies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={exportToCSV} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-50 rounded-lg p-4 border">
                <p className="text-sm text-slate-600">Total Rooms</p>
                <p className="text-2xl font-bold text-slate-900">
                  {Object.keys(suppliesByRoom).length}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border">
                <p className="text-sm text-slate-600">Total Supplies</p>
                <p className="text-2xl font-bold text-slate-900">
                  {filteredSupplies.length}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border">
                <p className="text-sm text-slate-600">Total Items</p>
                <p className="text-2xl font-bold text-slate-900">
                  {filteredSupplies.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0)}
                </p>
              </div>
            </div>

            {/* Supplies Table */}
            <div className="flex-1 overflow-auto border rounded-lg">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : filteredSupplies.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                  <FileText className="w-12 h-12 mb-4 text-slate-300" />
                  <p className="text-lg font-medium">No supplies found</p>
                  <p className="text-sm">Add supplies to rooms to see them here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Room</TableHead>
                      <TableHead>Supply Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Brand/Model</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Last Changed</TableHead>
                      <TableHead>Next Replacement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(suppliesByRoom).map(([roomName, roomSupplies]: [string, any]) => (
                      <>
                        <TableRow key={`header-${roomName}`} className="bg-slate-50 hover:bg-slate-50">
                          <TableCell colSpan={8} className="font-semibold text-slate-900">
                            {roomName} ({roomSupplies.length} {roomSupplies.length === 1 ? 'item' : 'items'})
                          </TableCell>
                        </TableRow>
                        {roomSupplies.map((supply: any) => (
                          <TableRow key={supply.id}>
                            <TableCell className="pl-8 text-slate-500 text-sm">
                              {supply.roomType}
                            </TableCell>
                            <TableCell className="font-medium">{supply.name}</TableCell>
                            <TableCell>
                              <Badge className={getTypeColor(supply.type)}>
                                {supply.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {supply.brand && supply.model
                                ? `${supply.brand} ${supply.model}`
                                : supply.brand || supply.model || "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {supply.quantity} {supply.unit}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {supply.location || "-"}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {supply.lastChanged
                                ? new Date(supply.lastChanged).toLocaleDateString()
                                : "-"}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {supply.nextReplacement
                                ? new Date(supply.nextReplacement).toLocaleDateString()
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
