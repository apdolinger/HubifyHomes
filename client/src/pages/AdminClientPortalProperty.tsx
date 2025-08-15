// Admin Client Portal Property Page - Alias to existing PropertyPortalSettings
import { useParams } from "wouter";
import PropertyPortalSettings from "./PropertyPortalSettings";

export default function AdminClientPortalProperty() {
  const params = useParams();
  
  // Forward all props to the existing PropertyPortalSettings component
  return <PropertyPortalSettings />;
}