// Admin Client Portal Main Page - Alias to existing PropertyCenter
import PropertyCenter from "./PropertyCenter";

export default function AdminClientPortal() {
  // Forward all functionality to the existing PropertyCenter component
  return <PropertyCenter />;
}