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
import { 
  Download, 
  FileText, 
  Search, 
  RefreshCw, 
  Package, 
  Cpu, 
  Lightbulb, 
  ExternalLink,
  ShoppingCart,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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

  // Fetch property data for all tabs
  const { data: supplies = [], isLoading: suppliesLoading } = useQuery({
    queryKey: [`/api/properties/${propertyId}/supplies-report`],
    enabled: isOpen && !!propertyId && activeTab === "supplies",
  });

  const { data: devices = [], isLoading: devicesLoading } = useQuery({
    queryKey: [`/api/properties/${propertyId}/devices-report`],
    enabled: isOpen && !!propertyId && activeTab === "devices",
  });

  const { data: fixtures = [], isLoading: fixturesLoading } = useQuery({
    queryKey: [`/api/properties/${propertyId}/fixtures-report`],
    enabled: isOpen && !!propertyId && activeTab === "fixtures",
  });

  const { data: surfaceLinks = [], isLoading: surfaceLinksLoading } = useQuery({
    queryKey: [`/api/properties/${propertyId}/surface-links-report`],
    enabled: isOpen && !!propertyId && activeTab === "surface-links",
  });

  const { data: shoppingList, isLoading: shoppingListLoading } = useQuery({
    queryKey: [`/api/properties/${propertyId}/shopping-list`],
    enabled: isOpen && !!propertyId && activeTab === "shopping-list",
  });

  // Filter functions for each tab
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
          supply.notes?.toLowerCase().includes(query)
        );
      })
    : [];

  const filteredDevices = Array.isArray(devices)
    ? devices.filter((device: any) => {
        const query = searchQuery.toLowerCase();
        return (
          device.name?.toLowerCase().includes(query) ||
          device.roomName?.toLowerCase().includes(query) ||
          device.roomType?.toLowerCase().includes(query) ||
          device.type?.toLowerCase().includes(query) ||
          device.brand?.toLowerCase().includes(query) ||
          device.model?.toLowerCase().includes(query) ||
          device.serialNumber?.toLowerCase().includes(query) ||
          device.location?.toLowerCase().includes(query) ||
          device.notes?.toLowerCase().includes(query)
        );
      })
    : [];

  const filteredFixtures = Array.isArray(fixtures)
    ? fixtures.filter((fixture: any) => {
        const query = searchQuery.toLowerCase();
        return (
          fixture.roomName?.toLowerCase().includes(query) ||
          fixture.roomType?.toLowerCase().includes(query) ||
          fixture.lightingNotes?.toLowerCase().includes(query) ||
          fixture.hvacNotes?.toLowerCase().includes(query) ||
          fixture.plumbingNotes?.toLowerCase().includes(query) ||
          fixture.electricalNotes?.toLowerCase().includes(query)
        );
      })
    : [];

  const filteredSurfaceLinks = Array.isArray(surfaceLinks)
    ? surfaceLinks.filter((link: any) => {
        const query = searchQuery.toLowerCase();
        return (
          link.name?.toLowerCase().includes(query) ||
          link.roomName?.toLowerCase().includes(query) ||
          link.roomType?.toLowerCase().includes(query) ||
          link.surfaceCategory?.toLowerCase().includes(query) ||
          link.url?.toLowerCase().includes(query) ||
          link.notes?.toLowerCase().includes(query)
        );
      })
    : [];

  // Group functions
  const suppliesByRoom = filteredSupplies.reduce((acc: any, supply: any) => {
    const roomName = supply.roomName || "Unassigned";
    if (!acc[roomName]) acc[roomName] = [];
    acc[roomName].push(supply);
    return acc;
  }, {});

  const devicesByRoom = filteredDevices.reduce((acc: any, device: any) => {
    const roomName = device.roomName || "Unassigned";
    if (!acc[roomName]) acc[roomName] = [];
    acc[roomName].push(device);
    return acc;
  }, {});

  const fixturesByRoom = filteredFixtures.reduce((acc: any, fixture: any) => {
    const roomName = fixture.roomName || "Unassigned";
    if (!acc[roomName]) acc[roomName] = [];
    acc[roomName].push(fixture);
    return acc;
  }, {});

  const surfaceLinksByRoom = filteredSurfaceLinks.reduce((acc: any, link: any) => {
    const roomName = link.roomName || "Unassigned";
    if (!acc[roomName]) acc[roomName] = [];
    acc[roomName].push(link);
    return acc;
  }, {});

  // CSV Export Functions
  // Type guard for shopping list
  const hasShoppingListData = shoppingList && (
    (Array.isArray(shoppingList.supplies) && shoppingList.supplies.length > 0) ||
    (Array.isArray(shoppingList.devices) && shoppingList.devices.length > 0) ||
    (Array.isArray(shoppingList.surfaceLinks) && shoppingList.surfaceLinks.length > 0)
  );

  const exportSuppliesCSV = () => {
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
      "Purchase URL",
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
      supply.purchaseUrl || "",
      supply.notes || "",
    ]);

    downloadCSV(headers, rows, `${propertyName}_supplies_report`);
  };

  const exportDevicesCSV = () => {
    if (filteredDevices.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no devices to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "Room",
      "Device Name",
      "Type",
      "Brand",
      "Model",
      "Serial Number",
      "Location",
      "Purchase Date",
      "Has Warranty",
      "Warranty Start",
      "Warranty End",
      "Requires Servicing",
      "Service Interval",
      "Next Service Due",
      "Link",
      "Notes",
    ];

    const rows = filteredDevices.map((device: any) => [
      device.roomName || "",
      device.name || "",
      device.type || "",
      device.brand || "",
      device.model || "",
      device.serialNumber || "",
      device.location || "",
      device.purchaseDate || "",
      device.hasWarranty ? "Yes" : "No",
      device.warrantyStart || "",
      device.warrantyEnd || "",
      device.requiresServicing ? "Yes" : "No",
      device.serviceInterval && device.serviceIntervalUnit
        ? `${device.serviceInterval} ${device.serviceIntervalUnit}`
        : "",
      device.nextServiceDue || "",
      device.link || "",
      device.notes || "",
    ]);

    downloadCSV(headers, rows, `${propertyName}_devices_report`);
  };

  const exportFixturesCSV = () => {
    if (filteredFixtures.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no fixtures to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "Room",
      "Light Fixtures",
      "Ceiling Fans",
      "Smoke Detectors",
      "CO Detectors",
      "Thermostats",
      "Water Shutoff Valves",
      "Electrical Outlets",
      "Lighting Notes",
      "HVAC Notes",
      "Plumbing Notes",
      "Electrical Notes",
    ];

    const rows = filteredFixtures.map((fixture: any) => [
      fixture.roomName || "",
      fixture.lightFixtures || 0,
      fixture.ceilingFans || 0,
      fixture.smokeDetectors || 0,
      fixture.coDetectors || 0,
      fixture.thermostats || 0,
      fixture.waterShutoffValves || 0,
      fixture.electricalOutlets || 0,
      fixture.lightingNotes || "",
      fixture.hvacNotes || "",
      fixture.plumbingNotes || "",
      fixture.electricalNotes || "",
    ]);

    downloadCSV(headers, rows, `${propertyName}_fixtures_report`);
  };

  const exportSurfaceLinksCSV = () => {
    if (filteredSurfaceLinks.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no surface links to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "Room",
      "Link Name",
      "Surface Category",
      "URL",
      "Notes",
    ];

    const rows = filteredSurfaceLinks.map((link: any) => [
      link.roomName || "",
      link.name || "",
      link.surfaceCategory || "",
      link.url || "",
      link.notes || "",
    ]);

    downloadCSV(headers, rows, `${propertyName}_surface_links_report`);
  };

  const exportShoppingListCSV = () => {
    if (!shoppingList || (
      shoppingList.supplies.length === 0 && 
      shoppingList.devices.length === 0 && 
      shoppingList.surfaceLinks.length === 0
    )) {
      toast({
        title: "No data to export",
        description: "There are no items in the shopping list.",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "Category",
      "Room",
      "Item Name",
      "Type/Category",
      "Details",
      "Action Needed",
      "Due Date",
      "Purchase URL",
      "Notes",
    ];

    const rows: any[] = [];

    // Add supplies
    shoppingList.supplies.forEach((supply: any) => {
      rows.push([
        "Supply",
        supply.roomName || "",
        supply.name || "",
        supply.type || "",
        supply.brand && supply.model ? `${supply.brand} ${supply.model}` : supply.brand || supply.model || "",
        "Replacement Needed",
        supply.nextReplacement || "",
        supply.purchaseUrl || "",
        supply.notes || "",
      ]);
    });

    // Add devices
    shoppingList.devices.forEach((device: any) => {
      rows.push([
        "Device",
        device.roomName || "",
        device.name || "",
        device.type || "",
        device.brand && device.model ? `${device.brand} ${device.model}` : device.brand || device.model || "",
        "Service Required",
        device.nextServiceDue || "",
        "",
        device.notes || "",
      ]);
    });

    // Add surface links
    shoppingList.surfaceLinks.forEach((link: any) => {
      rows.push([
        "Surface Link",
        link.roomName || "",
        link.name || "",
        link.surfaceCategory || "",
        "",
        "Purchase Link Available",
        "",
        link.url || "",
        link.notes || "",
      ]);
    });

    downloadCSV(headers, rows, `${propertyName}_shopping_list`);
  };

  const downloadCSV = (headers: string[], rows: any[][], filename: string) => {
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
    link.setAttribute("download", `${filename.replace(/[^a-z0-9]/gi, "_")}.csv`);
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

  const getSurfaceCategoryColor = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      flooring: "bg-amber-100 text-amber-800",
      wall: "bg-blue-100 text-blue-800",
      ceiling: "bg-sky-100 text-sky-800",
      countertop: "bg-purple-100 text-purple-800",
      trim: "bg-green-100 text-green-800",
      tile: "bg-cyan-100 text-cyan-800",
      cabinet: "bg-orange-100 text-orange-800",
      fixture: "bg-red-100 text-red-800",
      other: "bg-slate-100 text-slate-800",
    };
    return categoryMap[category] || "bg-slate-100 text-slate-800";
  };

  const isDateSoon = (dateString: string, daysThreshold: number = 30) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= daysThreshold && diffDays >= 0;
  };

  const isDateOverdue = (dateString: string) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    return date < now;
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
            <TabsTrigger value="supplies" data-testid="tab-supplies">
              <Package className="w-4 h-4 mr-2" />
              Supplies
            </TabsTrigger>
            <TabsTrigger value="devices" data-testid="tab-devices">
              <Cpu className="w-4 h-4 mr-2" />
              Devices
            </TabsTrigger>
            <TabsTrigger value="fixtures" data-testid="tab-fixtures">
              <Lightbulb className="w-4 h-4 mr-2" />
              Fixtures
            </TabsTrigger>
            <TabsTrigger value="surface-links" data-testid="tab-surface-links">
              <ExternalLink className="w-4 h-4 mr-2" />
              Surface Links
            </TabsTrigger>
            <TabsTrigger value="shopping-list" data-testid="tab-shopping-list">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Shopping List
            </TabsTrigger>
          </TabsList>

          {/* Supplies Tab */}
          <TabsContent value="supplies" className="flex-1 flex flex-col overflow-hidden mt-4">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search supplies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-supplies"
                />
              </div>
              <Button onClick={exportSuppliesCSV} variant="outline" data-testid="button-export-supplies">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>

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

            <div className="flex-1 overflow-auto border rounded-lg">
              {suppliesLoading ? (
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
                                ? format(new Date(supply.lastChanged), "MM/dd/yyyy")
                                : "-"}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {supply.nextReplacement
                                ? format(new Date(supply.nextReplacement), "MM/dd/yyyy")
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

          {/* Devices Tab */}
          <TabsContent value="devices" className="flex-1 flex flex-col overflow-hidden mt-4">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search devices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-devices"
                />
              </div>
              <Button onClick={exportDevicesCSV} variant="outline" data-testid="button-export-devices">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="bg-slate-50 rounded-lg p-4 border">
                <p className="text-sm text-slate-600">Total Devices</p>
                <p className="text-2xl font-bold text-slate-900">
                  {filteredDevices.length}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border">
                <p className="text-sm text-slate-600">With Warranty</p>
                <p className="text-2xl font-bold text-slate-900">
                  {filteredDevices.filter((d: any) => d.hasWarranty).length}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border">
                <p className="text-sm text-slate-600">Require Servicing</p>
                <p className="text-2xl font-bold text-slate-900">
                  {filteredDevices.filter((d: any) => d.requiresServicing).length}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border">
                <p className="text-sm text-slate-600">Rooms</p>
                <p className="text-2xl font-bold text-slate-900">
                  {Object.keys(devicesByRoom).length}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-auto border rounded-lg">
              {devicesLoading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : filteredDevices.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                  <Cpu className="w-12 h-12 mb-4 text-slate-300" />
                  <p className="text-lg font-medium">No devices found</p>
                  <p className="text-sm">Add devices to rooms to see them here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Room</TableHead>
                      <TableHead>Device Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Brand/Model</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Warranty</TableHead>
                      <TableHead>Service Status</TableHead>
                      <TableHead>Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(devicesByRoom).map(([roomName, roomDevices]: [string, any]) => (
                      <>
                        <TableRow key={`header-${roomName}`} className="bg-slate-50 hover:bg-slate-50">
                          <TableCell colSpan={8} className="font-semibold text-slate-900">
                            {roomName} ({roomDevices.length} {roomDevices.length === 1 ? 'device' : 'devices'})
                          </TableCell>
                        </TableRow>
                        {roomDevices.map((device: any) => (
                          <TableRow key={device.id}>
                            <TableCell className="pl-8 text-slate-500 text-sm">
                              {device.roomType}
                            </TableCell>
                            <TableCell className="font-medium">{device.name}</TableCell>
                            <TableCell className="text-sm">{device.type || "-"}</TableCell>
                            <TableCell className="text-sm">
                              {device.brand && device.model
                                ? `${device.brand} ${device.model}`
                                : device.brand || device.model || "-"}
                            </TableCell>
                            <TableCell className="text-sm">{device.location || "-"}</TableCell>
                            <TableCell>
                              {device.hasWarranty ? (
                                <Badge className="bg-green-100 text-green-800">
                                  {device.warrantyStart && device.warrantyEnd
                                    ? `${format(new Date(device.warrantyStart), "MM/dd/yy")} - ${format(new Date(device.warrantyEnd), "MM/dd/yy")}`
                                    : "Active"}
                                </Badge>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {device.requiresServicing && device.nextServiceDue ? (
                                <Badge className={
                                  isDateOverdue(device.nextServiceDue)
                                    ? "bg-red-100 text-red-800"
                                    : isDateSoon(device.nextServiceDue, 30)
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-blue-100 text-blue-800"
                                }>
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {format(new Date(device.nextServiceDue), "MM/dd/yyyy")}
                                </Badge>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {device.link ? (
                                <a
                                  href={device.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
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

          {/* Fixtures Tab */}
          <TabsContent value="fixtures" className="flex-1 flex flex-col overflow-hidden mt-4">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search fixtures..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-fixtures"
                />
              </div>
              <Button onClick={exportFixturesCSV} variant="outline" data-testid="button-export-fixtures">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-50 rounded-lg p-4 border">
                <p className="text-sm text-slate-600">Rooms with Fixtures</p>
                <p className="text-2xl font-bold text-slate-900">
                  {Object.keys(fixturesByRoom).length}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border">
                <p className="text-sm text-slate-600">Total Light Fixtures</p>
                <p className="text-2xl font-bold text-slate-900">
                  {filteredFixtures.reduce((sum: number, f: any) => sum + (f.lightFixtures || 0), 0)}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border">
                <p className="text-sm text-slate-600">Total Smoke Detectors</p>
                <p className="text-2xl font-bold text-slate-900">
                  {filteredFixtures.reduce((sum: number, f: any) => sum + (f.smokeDetectors || 0), 0)}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-auto border rounded-lg">
              {fixturesLoading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : filteredFixtures.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                  <Lightbulb className="w-12 h-12 mb-4 text-slate-300" />
                  <p className="text-lg font-medium">No fixtures found</p>
                  <p className="text-sm">Add fixtures to rooms to see them here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Room</TableHead>
                      <TableHead>Lights</TableHead>
                      <TableHead>Fans</TableHead>
                      <TableHead>Smoke</TableHead>
                      <TableHead>CO</TableHead>
                      <TableHead>Thermo</TableHead>
                      <TableHead>Valves</TableHead>
                      <TableHead>Outlets</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(fixturesByRoom).map(([roomName, roomFixtures]: [string, any]) => (
                      <>
                        <TableRow key={`header-${roomName}`} className="bg-slate-50 hover:bg-slate-50">
                          <TableCell colSpan={9} className="font-semibold text-slate-900">
                            {roomName}
                          </TableCell>
                        </TableRow>
                        {roomFixtures.map((fixture: any) => (
                          <TableRow key={fixture.id}>
                            <TableCell className="pl-8 text-slate-500 text-sm">
                              {fixture.roomType}
                            </TableCell>
                            <TableCell className="text-center">{fixture.lightFixtures || 0}</TableCell>
                            <TableCell className="text-center">{fixture.ceilingFans || 0}</TableCell>
                            <TableCell className="text-center">{fixture.smokeDetectors || 0}</TableCell>
                            <TableCell className="text-center">{fixture.coDetectors || 0}</TableCell>
                            <TableCell className="text-center">{fixture.thermostats || 0}</TableCell>
                            <TableCell className="text-center">{fixture.waterShutoffValves || 0}</TableCell>
                            <TableCell className="text-center">{fixture.electricalOutlets || 0}</TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate">
                              {[
                                fixture.lightingNotes,
                                fixture.hvacNotes,
                                fixture.plumbingNotes,
                                fixture.electricalNotes,
                              ]
                                .filter(Boolean)
                                .join(", ") || "-"}
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

          {/* Surface Links Tab */}
          <TabsContent value="surface-links" className="flex-1 flex flex-col overflow-hidden mt-4">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search surface links..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-surface-links"
                />
              </div>
              <Button onClick={exportSurfaceLinksCSV} variant="outline" data-testid="button-export-surface-links">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-50 rounded-lg p-4 border">
                <p className="text-sm text-slate-600">Total Links</p>
                <p className="text-2xl font-bold text-slate-900">
                  {filteredSurfaceLinks.length}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border">
                <p className="text-sm text-slate-600">Rooms</p>
                <p className="text-2xl font-bold text-slate-900">
                  {Object.keys(surfaceLinksByRoom).length}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border">
                <p className="text-sm text-slate-600">Categories</p>
                <p className="text-2xl font-bold text-slate-900">
                  {new Set(filteredSurfaceLinks.map((l: any) => l.surfaceCategory)).size}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-auto border rounded-lg">
              {surfaceLinksLoading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : filteredSurfaceLinks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                  <ExternalLink className="w-12 h-12 mb-4 text-slate-300" />
                  <p className="text-lg font-medium">No surface links found</p>
                  <p className="text-sm">Add surface links to rooms to see them here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Room</TableHead>
                      <TableHead>Link Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(surfaceLinksByRoom).map(([roomName, roomLinks]: [string, any]) => (
                      <>
                        <TableRow key={`header-${roomName}`} className="bg-slate-50 hover:bg-slate-50">
                          <TableCell colSpan={5} className="font-semibold text-slate-900">
                            {roomName} ({roomLinks.length} {roomLinks.length === 1 ? 'link' : 'links'})
                          </TableCell>
                        </TableRow>
                        {roomLinks.map((link: any) => (
                          <TableRow key={link.id}>
                            <TableCell className="pl-8 text-slate-500 text-sm">
                              {link.roomType}
                            </TableCell>
                            <TableCell className="font-medium">{link.name}</TableCell>
                            <TableCell>
                              <Badge className={getSurfaceCategoryColor(link.surfaceCategory)}>
                                {link.surfaceCategory}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 max-w-[300px] truncate"
                              >
                                {link.url}
                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              </a>
                            </TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate">
                              {link.notes || "-"}
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

          {/* Shopping List Tab */}
          <TabsContent value="shopping-list" className="flex-1 flex flex-col overflow-hidden mt-4">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="text-sm text-slate-600">
                Items needing attention within the next 90 days
              </div>
              <Button onClick={exportShoppingListCSV} variant="outline" data-testid="button-export-shopping-list">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-50 rounded-lg p-4 border">
                <p className="text-sm text-slate-600">Supplies to Replace</p>
                <p className="text-2xl font-bold text-slate-900">
                  {shoppingList?.supplies?.length || 0}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border">
                <p className="text-sm text-slate-600">Devices to Service</p>
                <p className="text-2xl font-bold text-slate-900">
                  {shoppingList?.devices?.length || 0}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border">
                <p className="text-sm text-slate-600">Purchase Links</p>
                <p className="text-2xl font-bold text-slate-900">
                  {shoppingList?.surfaceLinks?.length || 0}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-auto border rounded-lg">
              {shoppingListLoading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : !shoppingList || (
                shoppingList.supplies.length === 0 && 
                shoppingList.devices.length === 0 && 
                shoppingList.surfaceLinks.length === 0
              ) ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                  <ShoppingCart className="w-12 h-12 mb-4 text-slate-300" />
                  <p className="text-lg font-medium">Shopping list is empty</p>
                  <p className="text-sm">No items require attention at this time</p>
                </div>
              ) : (
                <div className="space-y-6 p-4">
                  {/* Supplies Section */}
                  {shoppingList.supplies.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Supplies Needing Replacement ({shoppingList.supplies.length})
                      </h3>
                      <div className="space-y-2">
                        {shoppingList.supplies.map((supply: any) => (
                          <div
                            key={supply.id}
                            className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-slate-900">{supply.name}</h4>
                                  <Badge className={getTypeColor(supply.type)}>{supply.type}</Badge>
                                  {isDateOverdue(supply.nextReplacement) && (
                                    <Badge className="bg-red-100 text-red-800">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      Overdue
                                    </Badge>
                                  )}
                                  {isDateSoon(supply.nextReplacement, 30) && !isDateOverdue(supply.nextReplacement) && (
                                    <Badge className="bg-yellow-100 text-yellow-800">
                                      Due Soon
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-slate-600">
                                  {supply.roomName} • {supply.quantity} {supply.unit}
                                  {supply.brand || supply.model ? ` • ${supply.brand || ""} ${supply.model || ""}`.trim() : ""}
                                </p>
                                {supply.notes && (
                                  <p className="text-sm text-slate-500 mt-1">{supply.notes}</p>
                                )}
                                {supply.nextReplacement && (
                                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Replace by: {format(new Date(supply.nextReplacement), "MMMM dd, yyyy")}
                                  </p>
                                )}
                              </div>
                              {supply.purchaseUrl && (
                                <a
                                  href={supply.purchaseUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-4"
                                >
                                  <Button size="sm" variant="outline">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Purchase
                                  </Button>
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Devices Section */}
                  {shoppingList.devices.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <Cpu className="w-5 h-5" />
                        Devices Needing Service ({shoppingList.devices.length})
                      </h3>
                      <div className="space-y-2">
                        {shoppingList.devices.map((device: any) => (
                          <div
                            key={device.id}
                            className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-slate-900">{device.name}</h4>
                                  {isDateOverdue(device.nextServiceDue) && (
                                    <Badge className="bg-red-100 text-red-800">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      Overdue
                                    </Badge>
                                  )}
                                  {isDateSoon(device.nextServiceDue, 30) && !isDateOverdue(device.nextServiceDue) && (
                                    <Badge className="bg-yellow-100 text-yellow-800">
                                      Due Soon
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-slate-600">
                                  {device.roomName}
                                  {device.type ? ` • ${device.type}` : ""}
                                  {device.brand || device.model ? ` • ${device.brand || ""} ${device.model || ""}`.trim() : ""}
                                </p>
                                {device.serviceInterval && device.serviceIntervalUnit && (
                                  <p className="text-sm text-slate-500 mt-1">
                                    Service every {device.serviceInterval} {device.serviceIntervalUnit}
                                  </p>
                                )}
                                {device.nextServiceDue && (
                                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Service by: {format(new Date(device.nextServiceDue), "MMMM dd, yyyy")}
                                  </p>
                                )}
                                {device.notes && (
                                  <p className="text-sm text-slate-500 mt-1">{device.notes}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Surface Links Section */}
                  {shoppingList.surfaceLinks.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <ExternalLink className="w-5 h-5" />
                        Surface Purchasing Links ({shoppingList.surfaceLinks.length})
                      </h3>
                      <div className="space-y-2">
                        {shoppingList.surfaceLinks.map((link: any) => (
                          <div
                            key={link.id}
                            className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-slate-900">{link.name}</h4>
                                  <Badge className={getSurfaceCategoryColor(link.surfaceCategory)}>
                                    {link.surfaceCategory}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-600">{link.roomName}</p>
                                {link.notes && (
                                  <p className="text-sm text-slate-500 mt-1">{link.notes}</p>
                                )}
                              </div>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-4"
                              >
                                <Button size="sm" variant="outline">
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  View Link
                                </Button>
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
