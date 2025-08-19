import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { importSampleData } from "./import-data";
import { getBrandingLevel, enforceBrandingPolicy, getBrandingCapabilities } from "./branding";
import { 
  insertCommunitySchema,
  insertPropertySchema,
  insertRoomSchema,
  insertRoomSupplySchema,
  insertRoomNoteSchema,
  insertRoomDeviceSchema,
  insertRoomSurfaceSchema,
  insertRoomFixtureSchema,
  insertRoomPhotoSchema,
  insertRoomChecklistSchema,
  insertVehicleSchema,
  insertVehicleMaintenanceSchema,
  insertVehicleNoteSchema,
  insertTaskSchema, 
  insertContactSchema, 
  insertTeamMessageSchema,
  insertFormSchema,
  insertFormSubmissionSchema,
  insertPropertyPortalSettingsSchema,
  type Form
} from "@shared/schema";
import { z } from "zod";

// HTML template for forms
function generateFormHTML(form: Form, isEmbed: boolean): string {
  const fields = Array.isArray(form.schema?.fields) ? form.schema.fields : [];
  
  const fieldHTML = fields.map((field: any) => {
    const required = field.required ? 'required' : '';
    const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
    
    switch (field.type) {
      case 'textarea':
        return `
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">${field.label}${field.required ? ' *' : ''}</label>
            <textarea name="${field.id}" ${required} placeholder="${field.placeholder || ''}" 
                      class="${inputClass}" rows="4"></textarea>
          </div>
        `;
      case 'select':
        const options = (field.options || []).map((opt: string) => 
          `<option value="${opt}">${opt}</option>`
        ).join('');
        return `
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">${field.label}${field.required ? ' *' : ''}</label>
            <select name="${field.id}" ${required} class="${inputClass}">
              <option value="">Select an option</option>
              ${options}
            </select>
          </div>
        `;
      case 'checkbox':
        return `
          <div class="mb-4">
            <div class="flex items-center">
              <input type="checkbox" name="${field.id}" ${required} id="${field.id}"
                     class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
              <label for="${field.id}" class="ml-2 block text-sm text-gray-700">${field.label}${field.required ? ' *' : ''}</label>
            </div>
          </div>
        `;
      default:
        return `
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">${field.label}${field.required ? ' *' : ''}</label>
            <input type="${field.type}" name="${field.id}" ${required} 
                   placeholder="${field.placeholder || ''}" class="${inputClass}">
          </div>
        `;
    }
  }).join('');

  const headerHTML = isEmbed ? '' : `
    <div class="bg-blue-600 text-white p-4 mb-6">
      <div class="container mx-auto">
        <h1 class="text-2xl font-bold">Hubify</h1>
      </div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${form.name}</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-50">
      ${headerHTML}
      <div class="container mx-auto px-4 py-8 max-w-2xl">
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">${form.name}</h2>
          ${form.description ? `<p class="text-gray-600 mb-6">${form.description}</p>` : ''}
          
          <form id="hubify-form" onsubmit="submitForm(event)">
            ${fieldHTML}
            
            <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
              Submit
            </button>
          </form>
          
          <div id="success-message" class="hidden mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p class="text-green-800">Thank you! Your form has been submitted successfully.</p>
          </div>
          
          <div id="error-message" class="hidden mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p class="text-red-800">There was an error submitting your form. Please try again.</p>
          </div>
        </div>
      </div>
      
      <script>
        async function submitForm(event) {
          event.preventDefault();
          const form = event.target;
          const submitButton = form.querySelector('button[type="submit"]');
          const successMessage = document.getElementById('success-message');
          const errorMessage = document.getElementById('error-message');
          
          submitButton.disabled = true;
          submitButton.textContent = 'Submitting...';
          
          try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            const response = await fetch('/forms/${form.formKey}/submit', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(data),
            });
            
            if (response.ok) {
              form.reset();
              successMessage.classList.remove('hidden');
              errorMessage.classList.add('hidden');
            } else {
              throw new Error('Submission failed');
            }
          } catch (error) {
            console.error('Error:', error);
            errorMessage.classList.remove('hidden');
            successMessage.classList.add('hidden');
          } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Submit';
          }
        }
      </script>
    </body>
    </html>
  `;
}

// Configure multer for file uploads
const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/photos';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'photo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_multer,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Legacy redirect middleware - must come before other routes
  app.use((req, res, next) => {
    const path = req.path;
    
    // UI page redirects
    if (path.startsWith("/property-centers/")) {
      const newPath = path.replace("/property-centers/", "/admin/client-portal/");
      return res.redirect(308, newPath);
    }
    
    // API endpoint redirects  
    if (path.startsWith("/api/property-centers/")) {
      const newPath = path.replace("/api/property-centers/", "/api/admin/client-portal/");
      return res.redirect(308, newPath);
    }
    
    next();
  });

  // Auth middleware
  await setupAuth(app);
  
  // Serve uploaded photos
  app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
  });
  app.use('/uploads', express.static('uploads'));

  // Development route to create a test user
  app.post('/api/dev/login', async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(404).json({ message: "Not found" });
    }
    
    try {
      // Create or get test user, always update to ensure admin role
      let user = await storage.getUserByEmail('test@hubify.com');
      user = await storage.upsertUser({
        id: 'dev-user-123',
        email: 'test@hubify.com',
        firstName: 'Test',
        lastName: 'User',
        profileImageUrl: null,
        role: 'admin', // Set admin role for development user
      });
      
      // Set session
      (req as any).session.user = {
        claims: { sub: user.id },
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
      };
      
      res.json({ message: "Logged in as test user", user });
    } catch (error) {
      console.error("Error creating test user:", error);
      res.status(500).json({ message: "Failed to create test user" });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User routes
  app.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/urgent-tasks", isAuthenticated, async (req, res) => {
    try {
      const urgentTasks = await storage.getUrgentTasks();
      res.json(urgentTasks);
    } catch (error) {
      console.error("Error fetching urgent tasks:", error);
      res.status(500).json({ message: "Failed to fetch urgent tasks" });
    }
  });

  app.get("/api/dashboard/team-messages", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getTeamMessages(10);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching team messages:", error);
      res.status(500).json({ message: "Failed to fetch team messages" });
    }
  });

  app.get("/api/dashboard/recent-activity", isAuthenticated, async (req, res) => {
    try {
      const activity = await storage.getRecentActivity(10);
      res.json(activity);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  // Community routes
  app.get("/api/communities", isAuthenticated, async (req, res) => {
    try {
      const communities = await storage.getCommunities();
      res.json(communities);
    } catch (error) {
      console.error("Error fetching communities:", error);
      res.status(500).json({ message: "Failed to fetch communities" });
    }
  });

  // Super Admin: Get all communities across all organizations  
  app.get("/api/super-admin/communities-report", isAuthenticated, async (req, res) => {
    try {
      // In production, add proper super admin role validation here
      const userId = (req.user as any)?.claims?.sub;
      
      const communitiesData = await storage.getAllCommunitiesForSuperAdmin();
      res.json(communitiesData);
    } catch (error) {
      console.error("Error fetching super admin communities report:", error);
      res.status(500).json({ message: "Failed to fetch communities report" });
    }
  });

  app.post("/api/communities", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      console.log("Creating community with data:", req.body);
      console.log("User ID:", userId);
      
      // Validate required fields
      if (!req.body.name) {
        return res.status(400).json({ message: "Community name is required" });
      }

      // Extract only the fields that exist in the current database schema
      const communityData = {
        name: req.body.name,
        address1: req.body.address1 || null,
        address2: req.body.address2 || null,
        city: req.body.city || null,
        state: req.body.state || null,
        zip: req.body.zip || null,
        notes: req.body.notes || null
      };

      const community = await storage.createCommunity(communityData, userId);
      res.status(201).json(community);
    } catch (error) {
      console.error("Error creating community:", error);
      res.status(500).json({ message: "Failed to create community", error: error.message });
    }
  });

  // Property routes
  app.get("/api/properties", isAuthenticated, async (req, res) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const properties = await storage.getProperties(includeInactive);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const property = await storage.getProperty(id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  app.post("/api/properties", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // For dev mode, use the default org. In production, this would come from the user's org
      const orgId = req.user.orgId || "00000000-0000-0000-0000-000000000000";
      
      console.log("Property creation request:", {
        body: req.body,
        userId,
        orgId,
        user: req.user
      });
      
      // Extract contactId from request body if provided
      const { contactId, ...propertyData } = req.body;
      
      const dataToValidate = {
        ...propertyData,
        orgId,
        managerId: userId,
      };
      
      console.log("Data being validated:", dataToValidate);
      
      const validatedData = insertPropertySchema.parse(dataToValidate);
      const property = await storage.createProperty(validatedData, userId);
      
      // If contactId is provided, create the property-contact association
      if (contactId) {
        await storage.linkContactToProperty(contactId, property.id, true, "owner");
        console.log(`Linked contact ${contactId} to property ${property.id}`);
      }
      
      res.status(201).json(property);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Zod validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating property:", error);
      res.status(500).json({ message: "Failed to create property" });
    }
  });

  // Update property
  app.patch("/api/properties/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid property ID' });
      }

      const property = await storage.updateProperty(id, req.body);
      res.json(property);
    } catch (error) {
      console.error("Error updating property:", error);
      res.status(500).json({ message: "Failed to update property" });
    }
  });

  // Delete property
  app.delete("/api/properties/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid property ID' });
      }

      await storage.deleteProperty(id);
      res.json({ message: 'Property deleted successfully' });
    } catch (error) {
      console.error('Error deleting property:', error);
      res.status(500).json({ message: 'Failed to delete property' });
    }
  });

  // Room routes
  app.get("/api/properties/:propertyId/rooms", isAuthenticated, async (req, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: 'Invalid property ID' });
      }
      
      const rooms = await storage.getRoomsByProperty(propertyId);
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  app.post("/api/rooms", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertRoomSchema.parse(req.body);
      const room = await storage.createRoom(validatedData);
      res.status(201).json(room);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating room:", error);
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  app.patch("/api/rooms/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid room ID' });
      }

      const room = await storage.updateRoom(id, req.body);
      res.json(room);
    } catch (error) {
      console.error("Error updating room:", error);
      res.status(500).json({ message: "Failed to update room" });
    }
  });

  app.delete("/api/rooms/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid room ID' });
      }

      await storage.deleteRoom(id);
      res.json({ message: 'Room deleted successfully' });
    } catch (error) {
      console.error('Error deleting room:', error);
      res.status(500).json({ message: 'Failed to delete room' });
    }
  });

  // Room supply routes
  app.get("/api/rooms/:roomId/supplies", isAuthenticated, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) {
        return res.status(400).json({ message: 'Invalid room ID' });
      }
      
      const supplies = await storage.getRoomSupplies(roomId);
      res.json(supplies);
    } catch (error) {
      console.error("Error fetching room supplies:", error);
      res.status(500).json({ message: "Failed to fetch room supplies" });
    }
  });

  app.post("/api/room-supplies", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertRoomSupplySchema.parse(req.body);
      const supply = await storage.createRoomSupply(validatedData);
      res.status(201).json(supply);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating room supply:", error);
      res.status(500).json({ message: "Failed to create room supply" });
    }
  });

  app.patch("/api/room-supplies/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid supply ID' });
      }

      const supply = await storage.updateRoomSupply(id, req.body);
      res.json(supply);
    } catch (error) {
      console.error("Error updating room supply:", error);
      res.status(500).json({ message: "Failed to update room supply" });
    }
  });

  app.delete("/api/room-supplies/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid supply ID' });
      }

      await storage.deleteRoomSupply(id);
      res.json({ message: 'Room supply deleted successfully' });
    } catch (error) {
      console.error('Error deleting room supply:', error);
      res.status(500).json({ message: 'Failed to delete room supply' });
    }
  });

  // Room note routes
  app.get("/api/rooms/:roomId/notes", isAuthenticated, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) {
        return res.status(400).json({ message: 'Invalid room ID' });
      }
      
      const notes = await storage.getRoomNotes(roomId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching room notes:", error);
      res.status(500).json({ message: "Failed to fetch room notes" });
    }
  });

  app.post("/api/room-notes", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertRoomNoteSchema.parse(req.body);
      const note = await storage.createRoomNote(validatedData);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating room note:", error);
      res.status(500).json({ message: "Failed to create room note" });
    }
  });

  app.patch("/api/room-notes/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid note ID' });
      }

      const note = await storage.updateRoomNote(id, req.body);
      res.json(note);
    } catch (error) {
      console.error("Error updating room note:", error);
      res.status(500).json({ message: "Failed to update room note" });
    }
  });

  app.delete("/api/room-notes/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid note ID' });
      }

      await storage.deleteRoomNote(id);
      res.json({ message: 'Room note deleted successfully' });
    } catch (error) {
      console.error('Error deleting room note:', error);
      res.status(500).json({ message: 'Failed to delete room note' });
    }
  });

  // Room device routes
  app.get("/api/rooms/:roomId/devices", isAuthenticated, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) {
        return res.status(400).json({ message: 'Invalid room ID' });
      }
      
      const devices = await storage.getRoomDevices(roomId);
      res.json(devices);
    } catch (error) {
      console.error("Error fetching room devices:", error);
      res.status(500).json({ message: "Failed to fetch room devices" });
    }
  });

  app.post("/api/room-devices", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertRoomDeviceSchema.parse(req.body);
      const device = await storage.createRoomDevice(validatedData);
      res.status(201).json(device);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating room device:", error);
      res.status(500).json({ message: "Failed to create room device" });
    }
  });

  app.patch("/api/room-devices/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid device ID' });
      }

      const device = await storage.updateRoomDevice(id, req.body);
      res.json(device);
    } catch (error) {
      console.error("Error updating room device:", error);
      res.status(500).json({ message: "Failed to update room device" });
    }
  });

  app.delete("/api/room-devices/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid device ID' });
      }

      await storage.deleteRoomDevice(id);
      res.json({ message: 'Room device deleted successfully' });
    } catch (error) {
      console.error('Error deleting room device:', error);
      res.status(500).json({ message: 'Failed to delete room device' });
    }
  });

  // Room surface routes
  app.get("/api/rooms/:roomId/surfaces", isAuthenticated, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) {
        return res.status(400).json({ message: 'Invalid room ID' });
      }
      
      const surfaces = await storage.getRoomSurfaces(roomId);
      res.json(surfaces);
    } catch (error) {
      console.error("Error fetching room surfaces:", error);
      res.status(500).json({ message: "Failed to fetch room surfaces" });
    }
  });

  app.post("/api/room-surfaces", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertRoomSurfaceSchema.parse(req.body);
      const surface = await storage.createRoomSurface(validatedData);
      res.status(201).json(surface);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating room surface:", error);
      res.status(500).json({ message: "Failed to create room surface" });
    }
  });

  app.patch("/api/room-surfaces/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid surface ID' });
      }

      const surface = await storage.updateRoomSurface(id, req.body);
      res.json(surface);
    } catch (error) {
      console.error("Error updating room surface:", error);
      res.status(500).json({ message: "Failed to update room surface" });
    }
  });

  app.delete("/api/room-surfaces/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid surface ID' });
      }

      await storage.deleteRoomSurface(id);
      res.json({ message: 'Room surface deleted successfully' });
    } catch (error) {
      console.error('Error deleting room surface:', error);
      res.status(500).json({ message: 'Failed to delete room surface' });
    }
  });

  // Room fixture routes
  app.get("/api/rooms/:roomId/fixtures", isAuthenticated, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) {
        return res.status(400).json({ message: 'Invalid room ID' });
      }
      
      const fixtures = await storage.getRoomFixtures(roomId);
      res.json(fixtures);
    } catch (error) {
      console.error("Error fetching room fixtures:", error);
      res.status(500).json({ message: "Failed to fetch room fixtures" });
    }
  });

  app.post("/api/room-fixtures", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertRoomFixtureSchema.parse(req.body);
      const fixture = await storage.createRoomFixture(validatedData);
      res.status(201).json(fixture);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating room fixture:", error);
      res.status(500).json({ message: "Failed to create room fixture" });
    }
  });

  app.patch("/api/room-fixtures/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid fixture ID' });
      }

      const fixture = await storage.updateRoomFixture(id, req.body);
      res.json(fixture);
    } catch (error) {
      console.error("Error updating room fixture:", error);
      res.status(500).json({ message: "Failed to update room fixture" });
    }
  });

  app.delete("/api/room-fixtures/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid fixture ID' });
      }

      await storage.deleteRoomFixture(id);
      res.json({ message: 'Room fixture deleted successfully' });
    } catch (error) {
      console.error('Error deleting room fixture:', error);
      res.status(500).json({ message: 'Failed to delete room fixture' });
    }
  });

  // Room photo routes
  app.get("/api/rooms/:roomId/photos", isAuthenticated, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) {
        return res.status(400).json({ message: 'Invalid room ID' });
      }
      
      const photos = await storage.getRoomPhotos(roomId);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching room photos:", error);
      res.status(500).json({ message: "Failed to fetch room photos" });
    }
  });

  app.post("/api/room-photos", isAuthenticated, upload.single('photo'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No photo file provided" });
      }

      const { roomId, category, description } = req.body;
      
      if (!roomId) {
        return res.status(400).json({ message: "Room ID is required" });
      }

      const userId = req.user.claims.sub;
      const photoData = {
        roomId: parseInt(roomId),
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: `/uploads/photos/${req.file.filename}`,
        category: category || 'general',
        description: description || '',
        uploadedById: userId,
      };

      const photo = await storage.createRoomPhoto(photoData);
      
      // Return photo with accessible URL
      res.status(201).json({
        ...photo,
        photoUrl: `/uploads/photos/${req.file.filename}`
      });
    } catch (error) {
      console.error("Error uploading room photo:", error);
      // Clean up uploaded file if database save failed
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ message: "Failed to upload room photo" });
    }
  });

  app.delete("/api/room-photos/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid photo ID' });
      }

      await storage.deleteRoomPhoto(id);
      res.json({ message: 'Room photo deleted successfully' });
    } catch (error) {
      console.error('Error deleting room photo:', error);
      res.status(500).json({ message: 'Failed to delete room photo' });
    }
  });

  // Room checklist routes
  app.get("/api/rooms/:roomId/checklists", isAuthenticated, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) {
        return res.status(400).json({ message: 'Invalid room ID' });
      }
      
      const checklists = await storage.getRoomChecklists(roomId);
      res.json(checklists);
    } catch (error) {
      console.error("Error fetching room checklists:", error);
      res.status(500).json({ message: "Failed to fetch room checklists" });
    }
  });

  app.post("/api/room-checklists", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertRoomChecklistSchema.parse(req.body);
      const checklist = await storage.createRoomChecklist(validatedData);
      res.status(201).json(checklist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating room checklist:", error);
      res.status(500).json({ message: "Failed to create room checklist" });
    }
  });

  app.patch("/api/room-checklists/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid checklist ID' });
      }

      const checklist = await storage.updateRoomChecklist(id, req.body);
      res.json(checklist);
    } catch (error) {
      console.error("Error updating room checklist:", error);
      res.status(500).json({ message: "Failed to update room checklist" });
    }
  });

  app.delete("/api/room-checklists/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid checklist ID' });
      }

      await storage.deleteRoomChecklist(id);
      res.json({ message: 'Room checklist deleted successfully' });
    } catch (error) {
      console.error('Error deleting room checklist:', error);
      res.status(500).json({ message: 'Failed to delete room checklist' });
    }
  });

  // Property notes routes
  app.get("/api/properties/:propertyId/notes", isAuthenticated, async (req, res) => {
    try {
      const propertyId = req.params.propertyId;
      if (!propertyId) {
        return res.status(400).json({ message: 'Invalid property ID' });
      }
      
      const notes = await storage.getPropertyNotes(propertyId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching property notes:", error);
      res.status(500).json({ message: "Failed to fetch property notes" });
    }
  });

  // Property contacts routes
  app.get("/api/properties/:propertyId/contacts", isAuthenticated, async (req, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: 'Invalid property ID' });
      }
      
      const contacts = await storage.getContactsByProperty(propertyId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching property contacts:", error);
      res.status(500).json({ message: "Failed to fetch property contacts" });
    }
  });

  // Vehicle routes
  app.get("/api/properties/:propertyId/vehicles", isAuthenticated, async (req, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: 'Invalid property ID' });
      }
      
      const vehicles = await storage.getVehicles(propertyId);
      res.json(vehicles);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      res.status(500).json({ message: "Failed to fetch vehicles" });
    }
  });

  app.get("/api/vehicles/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid vehicle ID' });
      }
      
      const vehicle = await storage.getVehicle(id);
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      res.json(vehicle);
    } catch (error) {
      console.error("Error fetching vehicle:", error);
      res.status(500).json({ message: "Failed to fetch vehicle" });
    }
  });

  app.post("/api/vehicles", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(validatedData);
      res.status(201).json(vehicle);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating vehicle:", error);
      res.status(500).json({ message: "Failed to create vehicle" });
    }
  });

  app.patch("/api/vehicles/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid vehicle ID' });
      }

      const vehicle = await storage.updateVehicle(id, req.body);
      res.json(vehicle);
    } catch (error) {
      console.error("Error updating vehicle:", error);
      res.status(500).json({ message: "Failed to update vehicle" });
    }
  });

  app.delete("/api/vehicles/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid vehicle ID' });
      }

      await storage.deleteVehicle(id);
      res.json({ message: 'Vehicle deleted successfully' });
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      res.status(500).json({ message: 'Failed to delete vehicle' });
    }
  });

  // Vehicle maintenance routes
  app.get("/api/vehicles/:vehicleId/maintenance", isAuthenticated, async (req, res) => {
    try {
      const vehicleId = parseInt(req.params.vehicleId);
      if (isNaN(vehicleId)) {
        return res.status(400).json({ message: 'Invalid vehicle ID' });
      }
      
      const maintenance = await storage.getVehicleMaintenance(vehicleId);
      res.json(maintenance);
    } catch (error) {
      console.error("Error fetching vehicle maintenance:", error);
      res.status(500).json({ message: "Failed to fetch vehicle maintenance" });
    }
  });

  app.post("/api/vehicle-maintenance", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertVehicleMaintenanceSchema.parse(req.body);
      const maintenance = await storage.createVehicleMaintenance(validatedData);
      res.status(201).json(maintenance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating vehicle maintenance:", error);
      res.status(500).json({ message: "Failed to create vehicle maintenance" });
    }
  });

  app.patch("/api/vehicle-maintenance/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid maintenance ID' });
      }

      const maintenance = await storage.updateVehicleMaintenance(id, req.body);
      res.json(maintenance);
    } catch (error) {
      console.error("Error updating vehicle maintenance:", error);
      res.status(500).json({ message: "Failed to update vehicle maintenance" });
    }
  });

  app.delete("/api/vehicle-maintenance/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid maintenance ID' });
      }

      await storage.deleteVehicleMaintenance(id);
      res.json({ message: 'Vehicle maintenance deleted successfully' });
    } catch (error) {
      console.error('Error deleting vehicle maintenance:', error);
      res.status(500).json({ message: 'Failed to delete vehicle maintenance' });
    }
  });

  // Vehicle notes routes
  app.get("/api/vehicles/:vehicleId/notes", isAuthenticated, async (req, res) => {
    try {
      const vehicleId = parseInt(req.params.vehicleId);
      if (isNaN(vehicleId)) {
        return res.status(400).json({ message: 'Invalid vehicle ID' });
      }
      
      const notes = await storage.getVehicleNotes(vehicleId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching vehicle notes:", error);
      res.status(500).json({ message: "Failed to fetch vehicle notes" });
    }
  });

  app.post("/api/vehicle-notes", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertVehicleNoteSchema.parse(req.body);
      const note = await storage.createVehicleNote(validatedData);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating vehicle note:", error);
      res.status(500).json({ message: "Failed to create vehicle note" });
    }
  });

  app.patch("/api/vehicle-notes/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid note ID' });
      }

      const note = await storage.updateVehicleNote(id, req.body);
      res.json(note);
    } catch (error) {
      console.error("Error updating vehicle note:", error);
      res.status(500).json({ message: "Failed to update vehicle note" });
    }
  });

  app.delete("/api/vehicle-notes/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid note ID' });
      }

      await storage.deleteVehicleNote(id);
      res.json({ message: 'Vehicle note deleted successfully' });
    } catch (error) {
      console.error('Error deleting vehicle note:', error);
      res.status(500).json({ message: 'Failed to delete vehicle note' });
    }
  });

  // Task routes
  app.get("/api/tasks", isAuthenticated, async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask({
        ...validatedData,
        assignedById: userId,
      });
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id/assign", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { assignedToId } = req.body;
      const assignedById = req.user.claims.sub;
      
      const task = await storage.assignTask(taskId, assignedToId, assignedById);
      res.json(task);
    } catch (error) {
      console.error("Error assigning task:", error);
      res.status(500).json({ message: "Failed to assign task" });
    }
  });

  app.patch("/api/tasks/:id", isAuthenticated, async (req, res) => {
    const taskId = parseInt(req.params.id);
    try {
      const updateData = req.body;
      console.log("Updating task:", taskId, "with data:", updateData);
      
      if (isNaN(taskId)) {
        return res.status(400).json({ 
          message: "Invalid task ID", 
          code: "INVALID_TASK_ID" 
        });
      }
      
      // Convert dueDate string to Date object if provided
      if (updateData.dueDate && typeof updateData.dueDate === 'string') {
        updateData.dueDate = new Date(updateData.dueDate);
        console.log("Converted dueDate to:", updateData.dueDate);
      }
      
      const task = await storage.updateTask(taskId, updateData);
      res.json(task);
    } catch (error) {
      console.error("Error updating task (ID:", taskId, "):", error);
      if (error instanceof Error && error.message?.includes('constraint')) {
        return res.status(400).json({ 
          message: "Database constraint violation", 
          code: "CONSTRAINT_VIOLATION",
          details: error.message 
        });
      }
      res.status(500).json({ 
        message: "Failed to update task", 
        code: "UPDATE_TASK_ERROR",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.patch("/api/tasks/:id/complete", isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.completeTask(taskId);
      res.json(task);
    } catch (error) {
      console.error("Error completing task:", error);
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  app.patch("/api/tasks/:id/archive", isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.archiveTask(taskId);
      res.json(task);
    } catch (error) {
      console.error("Error archiving task:", error);
      res.status(500).json({ message: "Failed to archive task" });
    }
  });

  app.delete("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      await storage.deleteTask(taskId);
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  app.post("/api/tasks/check-conflicts", isAuthenticated, async (req, res) => {
    try {
      const { assignedUserId, dueDate, timeEstimate, excludeTaskId } = req.body;
      const conflicts = await storage.checkTaskConflicts(assignedUserId, dueDate, timeEstimate, excludeTaskId);
      res.json(conflicts);
    } catch (error) {
      console.error("Error checking task conflicts:", error);
      res.status(500).json({ message: "Failed to check task conflicts" });
    }
  });

  // Contact routes
  app.get("/api/contacts", isAuthenticated, async (req, res) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const contacts = await storage.getContacts(includeInactive);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.get("/api/contacts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }

      const contact = await storage.getContact(id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      console.error("Error fetching contact:", error);
      res.status(500).json({ message: "Failed to fetch contact" });
    }
  });

  app.post("/api/contacts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertContactSchema.parse(req.body);
      const contact = await storage.createContact(validatedData, userId);
      res.status(201).json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating contact:", error);
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  app.patch("/api/contacts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }

      const updateData = insertContactSchema.partial().parse(req.body);
      const contact = await storage.updateContact(id, updateData);
      res.json(contact);
    } catch (error) {
      console.error("Error updating contact:", error);
      res.status(500).json({ message: "Failed to update contact" });
    }
  });

  // Contact-Property relationship endpoints
  app.get("/api/contacts/:contactId/properties", isAuthenticated, async (req, res) => {
    try {
      const contactId = parseInt(req.params.contactId);
      if (isNaN(contactId)) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }

      const properties = await storage.getContactProperties(contactId);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching contact properties:", error);
      res.status(500).json({ message: "Failed to fetch contact properties" });
    }
  });

  app.post("/api/contacts/:contactId/properties", isAuthenticated, async (req, res) => {
    try {
      const contactId = parseInt(req.params.contactId);
      if (isNaN(contactId)) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }

      const { propertyId, isPrimary, relationship } = req.body;
      if (!propertyId || isNaN(parseInt(propertyId))) {
        return res.status(400).json({ message: "Valid property ID is required" });
      }

      const contactProperty = await storage.linkContactToProperty(
        contactId, 
        parseInt(propertyId), 
        isPrimary || false, 
        relationship
      );
      res.status(201).json(contactProperty);
    } catch (error) {
      console.error("Error linking contact to property:", error);
      res.status(500).json({ message: "Failed to link contact to property" });
    }
  });

  // Delete contact-property relationship by relationship ID
  app.delete("/api/contacts/:contactId/properties/:relationshipId", isAuthenticated, async (req, res) => {
    try {
      const contactId = parseInt(req.params.contactId);
      const relationshipId = parseInt(req.params.relationshipId);
      
      if (isNaN(contactId) || isNaN(relationshipId)) {
        return res.status(400).json({ message: "Invalid contact ID or relationship ID" });
      }

      await storage.deleteContactProperty(relationshipId);
      res.json({ message: "Property unlinked successfully" });
    } catch (error) {
      console.error("Error unlinking contact from property:", error);
      res.status(500).json({ message: "Failed to unlink contact from property" });
    }
  });

  app.patch("/api/contacts/:contactId/properties/:propertyId/primary", isAuthenticated, async (req, res) => {
    try {
      const contactId = parseInt(req.params.contactId);
      const propertyId = parseInt(req.params.propertyId);
      
      if (isNaN(contactId) || isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid contact ID or property ID" });
      }

      await storage.setPrimaryProperty(contactId, propertyId);
      res.json({ message: "Primary property updated successfully" });
    } catch (error) {
      console.error("Error setting primary property:", error);
      res.status(500).json({ message: "Failed to set primary property" });
    }
  });

  // Delete contact
  app.delete("/api/contacts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid contact ID' });
      }

      await storage.deleteContact(id);
      res.json({ message: 'Contact deleted successfully' });
    } catch (error) {
      console.error('Error deleting contact:', error);
      res.status(500).json({ message: 'Failed to delete contact' });
    }
  });

  // Team message routes
  app.post("/api/team-messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertTeamMessageSchema.parse({
        ...req.body,
        authorId: userId,
      });
      const message = await storage.createTeamMessage(validatedData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating team message:", error);
      res.status(500).json({ message: "Failed to create team message" });
    }
  });

  app.put("/api/team-messages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const { content } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Message content is required" });
      }

      const updatedMessage = await storage.updateTeamMessage(
        messageId,
        content.trim(),
        req.user.claims.sub
      );

      if (!updatedMessage) {
        return res.status(404).json({ message: "Message not found or you don't have permission to edit it" });
      }

      res.json(updatedMessage);
    } catch (error) {
      console.error("Error updating team message:", error);
      res.status(500).json({ message: "Failed to update message" });
    }
  });

  app.delete("/api/team-messages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.id);
      
      await storage.deleteTeamMessage(messageId, req.user.claims.sub);
      
      res.json({ message: "Message deleted successfully" });
    } catch (error) {
      console.error("Error deleting team message:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  // Message reaction routes
  app.post("/api/team-messages/:id/reactions", isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const { reaction } = req.body;
      
      if (!reaction || typeof reaction !== 'string') {
        return res.status(400).json({ message: "Reaction is required" });
      }

      const result = await storage.toggleReaction(messageId, req.user.claims.sub, reaction);
      
      res.json(result);
    } catch (error) {
      console.error("Error toggling reaction:", error);
      res.status(500).json({ message: "Failed to toggle reaction" });
    }
  });

  // Reply to message route
  app.post("/api/team-messages/:id/reply", isAuthenticated, async (req: any, res) => {
    try {
      const parentId = parseInt(req.params.id);
      const { content, emailNotification = false } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Reply content is required" });
      }

      const reply = await storage.createTeamMessage({
        content: content.trim(),
        authorId: req.user.claims.sub,
        parentId,
        emailNotification,
      });

      res.status(201).json(reply);
    } catch (error) {
      console.error("Error creating reply:", error);
      res.status(500).json({ message: "Failed to create reply" });
    }
  });

  // Search routes
  app.get("/api/search", isAuthenticated, async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      const results = await storage.globalSearch(q);
      res.json(results);
    } catch (error) {
      console.error("Error performing search:", error);
      res.status(500).json({ message: "Failed to perform search" });
    }
  });

  // Duplicate detection and management
  app.post("/api/duplicates/scan", isAuthenticated, async (req, res) => {
    try {
      const criteria = req.body.criteria || {
        nameThreshold: 85,
        emailExact: true,
        phoneNormalized: true,
        addressThreshold: 80,
        includeContacts: true,
        includeProperties: true,
        minimumConfidence: 70
      };

      const duplicates = await storage.scanForDuplicates(criteria);
      res.json({ duplicates, scanTime: new Date().toISOString() });
    } catch (error) {
      console.error("Error scanning for duplicates:", error);
      res.status(500).json({ message: "Failed to scan for duplicates" });
    }
  });

  app.get("/api/duplicates", isAuthenticated, async (req, res) => {
    try {
      const duplicates = await storage.getDuplicates();
      res.json(duplicates);
    } catch (error) {
      console.error("Error fetching duplicates:", error);
      res.status(500).json({ message: "Failed to fetch duplicates" });
    }
  });

  app.post("/api/duplicates/ignore", isAuthenticated, async (req: any, res) => {
    try {
      const { recordType, recordIds, reason } = req.body;
      
      if (!recordType || !recordIds || !Array.isArray(recordIds)) {
        return res.status(400).json({ message: "recordType and recordIds array are required" });
      }
      
      await storage.ignoreDuplicate(recordType, recordIds, req.user.claims.sub, reason);
      res.json({ message: "Duplicate ignored successfully" });
    } catch (error) {
      console.error("Error ignoring duplicate:", error);
      res.status(500).json({ message: "Failed to ignore duplicate" });
    }
  });

  app.get("/api/duplicates/history", isAuthenticated, async (req, res) => {
    try {
      const history = await storage.getDuplicateHistory();
      res.json(history);
    } catch (error) {
      console.error("Error fetching duplicate history:", error);
      res.status(500).json({ message: "Failed to fetch duplicate history" });
    }
  });

  // Smart merge multiple duplicates
  app.post("/api/duplicates/merge-multiple", isAuthenticated, async (req, res) => {
    try {
      const { recordIds, type, mergeNotes } = req.body;
      
      if (!recordIds || recordIds.length < 2) {
        return res.status(400).json({ message: "At least 2 records required for merge" });
      }
      
      if (type === 'contact') {
        // Get all contacts to merge
        const allContacts = await db.select().from(contacts);
        const contactsToMerge = allContacts.filter(c => recordIds.includes(c.id));
        
        if (contactsToMerge.length !== recordIds.length) {
          return res.status(404).json({ message: "Some contacts not found" });
        }
        
        // Sort by completeness - most complete becomes primary
        const calculateCompleteness = (contact: any): number => {
          let score = 0;
          if (contact.first_name) score += 20;
          if (contact.last_name) score += 20;
          if (contact.email) score += 25;
          if (contact.phone) score += 20;
          if (contact.address) score += 10;
          if (contact.type) score += 5;
          return score;
        };
        
        const sortedContacts = contactsToMerge.sort((a, b) => {
          const scoreA = calculateCompleteness(a);
          const scoreB = calculateCompleteness(b);
          return scoreB - scoreA;
        });
        
        const primary = sortedContacts[0];
        const duplicates = sortedContacts.slice(1);
        
        // Create smart merged record
        const mergedData = { ...primary };
        
        duplicates.forEach(duplicate => {
          // Fill in missing fields from duplicates
          Object.keys(duplicate).forEach(key => {
            if (key === 'id') return;
            
            if (!mergedData[key] && duplicate[key]) {
              mergedData[key] = duplicate[key];
            }
            
            // For strings, prefer longer/more complete versions
            if (typeof mergedData[key] === 'string' && typeof duplicate[key] === 'string') {
              if (duplicate[key].length > mergedData[key].length) {
                mergedData[key] = duplicate[key];
              }
            }
          });
        });
        
        // Update primary record with merged data
        await db.update(contacts)
          .set({
            ...mergedData,
            updated_at: new Date()
          })
          .where(eq(contacts.id, primary.id));
        
        // Delete duplicate records
        const duplicateIds = duplicates.map(d => d.id);
        for (const duplicateId of duplicateIds) {
          await db.delete(contacts).where(eq(contacts.id, duplicateId));
        }
        
        // Log the merge activity
        await storage.createActivity({
          user_id: req.user?.claims?.sub,
          type: 'contact_merge',
          entity_type: 'contact',
          entity_id: primary.id,
          description: `Merged ${duplicates.length} duplicate contacts into primary record`,
          details: JSON.stringify({ 
            mergedContactIds: duplicateIds,
            mergeNotes,
            totalRecords: contactsToMerge.length 
          })
        });
        
        res.json({ 
          success: true, 
          primaryId: primary.id, 
          deletedIds: duplicateIds,
          mergedRecords: contactsToMerge.length 
        });
        
      } else {
        res.status(400).json({ message: "Property merge not yet implemented" });
      }
      
    } catch (error) {
      console.error("Error merging duplicates:", error);
      res.status(500).json({ message: "Failed to merge duplicates" });
    }
  });

  // Forms API routes
  app.get("/api/forms", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.user as any).claims.sub);
      if (!user?.orgId) {
        return res.status(404).json({ message: "User organization not found" });
      }
      const forms = await storage.getForms(user.orgId);
      res.json(forms);
    } catch (error) {
      console.error("Error fetching forms:", error);
      res.status(500).json({ message: "Failed to fetch forms" });
    }
  });

  app.post("/api/forms", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check tier limits
      const tierLimits = { basic: 2, standard: 20, premium: Infinity };
      const userTier = user.tier || 'basic';
      const currentLimit = tierLimits[userTier as keyof typeof tierLimits] || 0;
      
      const existingForms = await storage.getForms(user.orgId!);
      if (existingForms.length >= currentLimit) {
        return res.status(403).json({ 
          message: `Form limit reached for ${userTier} plan` 
        });
      }

      const form = await storage.createForm({
        name: req.body.name,
        description: req.body.description,
        schema: req.body.schema,
        orgId: user.orgId
      });
      res.json(form);
    } catch (error) {
      console.error("Error creating form:", error);
      res.status(500).json({ message: "Failed to create form" });
    }
  });

  app.delete("/api/forms/:id", isAuthenticated, async (req: any, res) => {
    try {
      const formId = parseInt(req.params.id);
      const userId = (req.user as any).claims.sub;
      
      await storage.deleteForm(formId, userId);
      res.json({ message: "Form deleted successfully" });
    } catch (error) {
      console.error("Error deleting form:", error);
      res.status(500).json({ message: "Failed to delete form" });
    }
  });

  // Public form routes (no authentication required)
  app.get("/forms/:formKey", async (req, res) => {
    try {
      const form = await storage.getFormByKey(req.params.formKey);
      if (!form) {
        return res.status(404).send("Form not found");
      }
      
      // Render form page with branding
      res.send(generateFormHTML(form, false));
    } catch (error) {
      console.error("Error fetching form:", error);
      res.status(500).send("Error loading form");
    }
  });

  app.get("/forms/:formKey/embed", async (req, res) => {
    try {
      const form = await storage.getFormByKey(req.params.formKey);
      if (!form) {
        return res.status(404).send("Form not found");
      }
      
      if (!form.embedEnabled) {
        return res.status(403).send("Embedding not enabled for this form");
      }
      
      // Render form page without branding
      res.send(generateFormHTML(form, true));
    } catch (error) {
      console.error("Error fetching form:", error);
      res.status(500).send("Error loading form");
    }
  });

  // Form submission with profile matching logic
  app.post("/forms/:formKey/submit", async (req, res) => {
    try {
      const form = await storage.getFormByKey(req.params.formKey);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      const submissionData = req.body;
      const formSchema = form.schema as any;
      let profileId = null;

      // Handle profile matching and creation if form has mapping
      if (formSchema?.matchExistingBy && formSchema?.fieldMapping) {
        const identifier = formSchema.matchExistingBy;
        const matchKey = identifier === 'email' ? submissionData.email : submissionData.phone;

        if (matchKey) {
          // Try to find existing contact
          let existingContact = null;
          try {
            if (identifier === 'email') {
              existingContact = await storage.getContactByEmail(matchKey, form.orgId);
            } else {
              existingContact = await storage.getContactByPhone(matchKey, form.orgId);
            }
          } catch (error) {
            console.log("Contact lookup failed:", error);
          }

          if (existingContact) {
            // Update existing profile with new data
            const updateData: any = {};
            Object.entries(formSchema.fieldMapping).forEach(([formFieldId, profileField]) => {
              if (submissionData[formFieldId] && profileField !== 'none') {
                updateData[profileField] = submissionData[formFieldId];
              }
            });

            if (Object.keys(updateData).length > 0) {
              await storage.updateContact(existingContact.id, updateData);
            }
            profileId = existingContact.id;
          } else {
            // Create new profile
            const newProfileData: any = {
              orgId: form.orgId
            };
            
            Object.entries(formSchema.fieldMapping).forEach(([formFieldId, profileField]) => {
              if (submissionData[formFieldId] && profileField !== 'none') {
                newProfileData[profileField] = submissionData[formFieldId];
              }
            });

            if (newProfileData.firstName || newProfileData.lastName || newProfileData.email || newProfileData.phone) {
              const newContact = await storage.createContact(newProfileData, null);
              profileId = newContact.id;
            }
          }
        }
      } else {
        // Fallback: Extract mapped fields and create contact if configured (legacy behavior)
        if (req.body.email && (req.body.firstName || req.body.name)) {
          try {
            const newContact = await storage.createContact({
              firstName: req.body.firstName || req.body.name?.split(' ')[0] || 'Unknown',
              lastName: req.body.lastName || req.body.name?.split(' ').slice(1).join(' ') || '',
              email: req.body.email,
              phone: req.body.phone || null,
              type: 'client',
              isActive: true,
              orgId: form.orgId
            }, null);
            profileId = newContact.id;
          } catch (contactError) {
            console.warn("Could not create contact from form submission:", contactError);
          }
        }
      }

      // Create form submission with profile reference
      await storage.createFormSubmission({
        formId: form.id,
        data: submissionData,
        profileId: profileId
      });

      // Log form submission
      console.log(`Form submission processed: formId=${form.id}, profileId=${profileId}, timestamp=${Date.now()}`);

      // TODO: Implement automation triggers if needed
      if (formSchema?.triggerAutomation) {
        console.log(`Automation triggered for form: ${formSchema.slug}`);
        // triggerAutomation(formSchema.slug, submissionData);
      }

      res.json({ message: "Form submitted successfully" });
    } catch (error) {
      console.error("Error submitting form:", error);
      res.status(500).json({ message: "Failed to submit form" });
    }
  });

  // Data import endpoint (for importing sample data)
  app.post("/api/import-sample-data", async (req: any, res) => {
    try {
      console.log("Starting sample data import...");
      
      const csvData = [
        {
          fullName: "Bruce Wayne",
          propertyName: "Wayne Manor",
          streetAddress: "1313 Mockingbird Ln.",
          city: "Gotham City",
          state: "NJ",
          zipCode: "00001",
          phoneNumber: "(807) 536-1076",
          email: "bruce.wayne@example.com",
          tasks: "Replace roof tiles; Inspect security cameras"
        },
        {
          fullName: "Tony Stark",
          propertyName: "Stark Lake House",
          streetAddress: "10880 Malibu Point",
          city: "Malibu",
          state: "CA",
          zipCode: "90265",
          phoneNumber: "(625) 667-8476",
          email: "tony.stark@example.com",
          tasks: "Calibrate solar panels; Reset water system"
        },
        {
          fullName: "Bilbo Baggins",
          propertyName: "Bag End",
          streetAddress: "111 Bag End, Bagshot Row",
          city: "Hobbiton, The Shire",
          state: "ME",
          zipCode: "24791",
          phoneNumber: "(397) 259-9198",
          email: "bilbo.baggins@example.com",
          tasks: "Chimney sweep; Pantry pest control"
        },
        {
          fullName: "Jay Gatsby",
          propertyName: "Gatsby Estate",
          streetAddress: "1 Gatsby Lane",
          city: "West Egg",
          state: "NY",
          zipCode: "11560",
          phoneNumber: "(734) 348-9487",
          email: "jay.gatsby@example.com",
          tasks: "Clean pool; Repair ballroom lights"
        },
        {
          fullName: "Elsa Arendelle",
          propertyName: "Ice Castle",
          streetAddress: "1 Ice Palace Rd",
          city: "North Mountain",
          state: "AK",
          zipCode: "99686",
          phoneNumber: "(918) 766-7895",
          email: "elsa.arendelle@example.com",
          tasks: "De-ice entry; Inspect HVAC"
        },
        {
          fullName: "Clark Kent",
          propertyName: "Smallville Farmhouse",
          streetAddress: "100 Farmhouse Way",
          city: "Smallville",
          state: "KS",
          zipCode: "67524",
          phoneNumber: "(884) 945-4765",
          email: "clark.kent@example.com",
          tasks: "Repair barn door; Reset perimeter alert"
        },
        {
          fullName: "Sherlock Holmes",
          propertyName: "221B Baker Street",
          streetAddress: "221B Baker Street",
          city: "London",
          state: "UK",
          zipCode: "NW1 6XE",
          phoneNumber: "(366) 722-1185",
          email: "sherlock.holmes@example.com",
          tasks: "Check gas line; Fix loose window latch"
        },
        {
          fullName: "Lara Croft",
          propertyName: "Croft Manor",
          streetAddress: "1 Croft Manor",
          city: "Surrey",
          state: "UK",
          zipCode: "GU1 1AA",
          phoneNumber: "(743) 571-6460",
          email: "lara.croft@example.com",
          tasks: "Fix surveillance system; Schedule garden trim"
        },
        {
          fullName: "Doc Brown",
          propertyName: "Hill Valley Garage",
          streetAddress: "1640 Riverside Drive",
          city: "Hill Valley",
          state: "CA",
          zipCode: "95420",
          phoneNumber: "(380) 547-9627",
          email: "doc.brown@example.com",
          tasks: "Clean flux capacitor bay; Inspect storm damage"
        },
        {
          fullName: "Willy Wonka",
          propertyName: "Chocolate Factory Guest House",
          streetAddress: "10 Candy Cane Lane",
          city: "Candy Town",
          state: "PA",
          zipCode: "15001",
          phoneNumber: "(720) 511-5742",
          email: "willy.wonka@example.com",
          tasks: "Sanitize chocolate river filter; Inspect candy wall"
        }
      ];

      const importResults = {
        properties: 0,
        contacts: 0,
        tasks: 0
      };

      for (const record of csvData) {
        console.log(`Processing ${record.fullName}...`);
        
        // Split full name
        const nameParts = record.fullName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        
        // Create property
        const property = await storage.createProperty({
          name: record.propertyName,
          type: "house",
          address1: record.streetAddress,
          address2: "",
          city: record.city,
          state: record.state,
          zip: record.zipCode,
          status: "occupied", // Use default status from schema
          units: 1,
          isActive: true,
          orgId: "00000000-0000-0000-0000-000000000000", // Default org for imported data
          managerId: null
        }, null); // Use null for user_id to avoid foreign key constraint
        
        importResults.properties++;
        console.log(`Created property: ${property.name}`);
        
        // Create contact
        const contact = await storage.createContact({
          firstName,
          lastName,
          email: record.email,
          phone: record.phoneNumber,
          type: "owner",
          propertyId: property.id,
          isActive: true
        }, null); // Use null for user_id to avoid foreign key constraint
        
        importResults.contacts++;
        console.log(`Created contact: ${contact.firstName} ${contact.lastName}`);
        
        // Create tasks
        const taskList = record.tasks.split(';').map(task => task.trim());
        
        for (const taskTitle of taskList) {
          if (taskTitle) {
            const task = await storage.createTask({
              title: taskTitle,
              description: `Task for ${record.propertyName}`,
              priority: "normal",
              status: "pending",
              propertyId: property.id,
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              assignedToId: null,
              assignedById: null
            }, null); // Use null for user_id to avoid foreign key constraint
            
            importResults.tasks++;
            console.log(`Created task: ${task.title}`);
          }
        }
      }
      
      console.log("Import completed successfully!");
      console.log(`Results: ${importResults.properties} properties, ${importResults.contacts} contacts, ${importResults.tasks} tasks`);
      
      res.json({
        success: true,
        message: `Successfully imported ${importResults.properties} properties, ${importResults.contacts} contacts, and ${importResults.tasks} tasks`,
        results: importResults
      });

    } catch (error) {
      console.error("Error importing data:", error);
      res.status(500).json({ 
        success: false, 
        message: `Failed to import data: ${error}` 
      });
    }
  });

  // Organization and Branding routes
  app.get("/api/orgs/:orgId/branding", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const org = await storage.getOrg(orgId);
      
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const subscription = await storage.getOrgSubscription(orgId);
      const tier = subscription?.tier || "starter";
      const capabilities = getBrandingCapabilities(tier as any);

      res.json({
        branding: org.branding || {},
        theme: org.theme || {},
        capabilities,
        tier
      });
    } catch (error) {
      console.error("Error fetching organization branding:", error);
      res.status(500).json({ message: "Failed to fetch organization branding" });
    }
  });

  app.patch("/api/orgs/:orgId/branding", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const org = await storage.getOrg(orgId);
      
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Get current branding level based on subscription
      const brandingLevel = await getBrandingLevel(orgId);
      
      // Enforce branding policy
      const allowedData = enforceBrandingPolicy(brandingLevel, req.body);
      
      // Update organization with enforced branding
      const updatedOrg = await storage.updateOrg(orgId, {
        branding: allowedData.branding,
        theme: allowedData.theme,
      });

      res.json({
        branding: updatedOrg.branding,
        theme: updatedOrg.theme,
        level: brandingLevel
      });
    } catch (error) {
      console.error("Error updating organization branding:", error);
      res.status(500).json({ message: "Failed to update organization branding" });
    }
  });

  app.get("/api/orgs/:orgId/subscription", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const subscription = await storage.getOrgSubscription(orgId);
      
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      const capabilities = getBrandingCapabilities(subscription.tier as any);
      
      res.json({
        ...subscription,
        capabilities
      });
    } catch (error) {
      console.error("Error fetching organization subscription:", error);
      res.status(500).json({ message: "Failed to fetch organization subscription" });
    }
  });

  // Property Portal Settings routes
  app.get("/api/orgs/:orgId/properties/:propertyId/portal-settings", isAuthenticated, async (req, res) => {
    try {
      const { orgId, propertyId } = req.params;
      const { status } = req.query;
      
      if (status) {
        // Get latest settings for specific status
        const settings = await storage.getLatestPropertyPortalSettings(orgId, parseInt(propertyId), status as string);
        return res.json(settings || null);
      } else {
        // Get all settings versions
        const allSettings = await storage.getPropertyPortalSettings(orgId, parseInt(propertyId));
        return res.json(allSettings);
      }
    } catch (error) {
      console.error("Error fetching property portal settings:", error);
      res.status(500).json({ message: "Failed to fetch property portal settings" });
    }
  });

  app.post("/api/orgs/:orgId/properties/:propertyId/portal-settings", isAuthenticated, async (req, res) => {
    try {
      const { orgId, propertyId } = req.params;
      
      // Get current branding level to enforce policy
      const brandingLevel = await getBrandingLevel(orgId);
      
      // Extract branding data and enforce policy
      const brandingData = {
        branding: req.body.branding || {},
        theme: req.body.theme || {}
      };
      const allowedBranding = enforceBrandingPolicy(brandingLevel, brandingData);
      
      // Get the next version number
      const existingSettings = await storage.getPropertyPortalSettings(orgId, parseInt(propertyId));
      const nextVersion = existingSettings.length > 0 ? Math.max(...existingSettings.map(s => s.version)) + 1 : 1;
      
      const settingsData = {
        orgId,
        propertyId: parseInt(propertyId),
        version: nextVersion,
        status: req.body.status || "draft",
        branding: allowedBranding.branding,
        theme: allowedBranding.theme,
        layout: req.body.layout || {},
        modulesEnabled: req.body.modulesEnabled || { taskRequests: true, messages: true },
        copy: req.body.copy || {},
        legal: req.body.legal || {},
        i18n: req.body.i18n || { defaultLocale: "en", supportedLocales: ["en"] },
        featureFlags: req.body.featureFlags || [],
        authOptions: req.body.authOptions || { allowedLogin: "both", mfa: "sms" }
      };
      
      const parsedData = insertPropertyPortalSettingsSchema.parse(settingsData);
      const settings = await storage.createPropertyPortalSettings(parsedData);
      
      res.status(201).json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating property portal settings:", error);
      res.status(500).json({ message: "Failed to create property portal settings" });
    }
  });

  app.patch("/api/orgs/:orgId/properties/:propertyId/portal-settings/:settingsId", isAuthenticated, async (req, res) => {
    try {
      const { orgId, settingsId } = req.params;
      
      // Get current branding level to enforce policy
      const brandingLevel = await getBrandingLevel(orgId);
      
      // Extract branding data and enforce policy if provided
      const updateData: any = { ...req.body };
      if (req.body.branding || req.body.theme) {
        const brandingData = {
          branding: req.body.branding || {},
          theme: req.body.theme || {}
        };
        const allowedBranding = enforceBrandingPolicy(brandingLevel, brandingData);
        updateData.branding = allowedBranding.branding;
        updateData.theme = allowedBranding.theme;
      }
      
      const settings = await storage.updatePropertyPortalSettings(settingsId, updateData);
      res.json(settings);
    } catch (error) {
      console.error("Error updating property portal settings:", error);
      res.status(500).json({ message: "Failed to update property portal settings" });
    }
  });

  app.post("/api/orgs/:orgId/properties/:propertyId/portal-settings/publish", isAuthenticated, async (req, res) => {
    try {
      const { orgId, propertyId } = req.params;
      const { version } = req.body;
      
      if (!version) {
        return res.status(400).json({ message: "Version is required" });
      }
      
      const settings = await storage.publishPropertyPortalSettings(orgId, parseInt(propertyId), version);
      res.json(settings);
    } catch (error) {
      console.error("Error publishing property portal settings:", error);
      res.status(500).json({ message: "Failed to publish property portal settings" });
    }
  });

  // Property Forms Assignment routes
  app.get("/api/orgs/:orgId/properties/:propertyId/forms", isAuthenticated, async (req, res) => {
    try {
      const { orgId, propertyId } = req.params;
      const propertyForms = await storage.getPropertyForms(orgId, propertyId);
      res.json(propertyForms);
    } catch (error) {
      console.error("Error fetching property forms:", error);
      res.status(500).json({ message: "Failed to fetch property forms" });
    }
  });

  app.post("/api/orgs/:orgId/properties/:propertyId/forms", isAuthenticated, async (req, res) => {
    try {
      const { orgId, propertyId } = req.params;
      const { form_id, sort_order, is_required } = req.body;

      if (!form_id) {
        return res.status(400).json({ error: "form_id is required" });
      }

      const assignment = await storage.assignFormToProperty(
        orgId, 
        propertyId, 
        form_id, 
        sort_order ?? 0, 
        !!is_required
      );
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning form to property:", error);
      if (error.message === "Form not found") {
        res.status(404).json({ error: "Form not found" });
      } else {
        res.status(500).json({ message: "Failed to assign form to property" });
      }
    }
  });

  app.delete("/api/orgs/:orgId/properties/:propertyId/forms", isAuthenticated, async (req, res) => {
    try {
      const { orgId, propertyId } = req.params;
      const { form_id } = req.query;

      if (!form_id) {
        return res.status(400).json({ error: "form_id required" });
      }

      await storage.removeFormFromProperty(orgId, propertyId, form_id as string);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error removing form from property:", error);
      res.status(500).json({ message: "Failed to remove form from property" });
    }
  });

  app.patch("/api/orgs/:orgId/properties/:propertyId/forms/:formId", isAuthenticated, async (req, res) => {
    try {
      const { orgId, propertyId, formId } = req.params;
      const { sort_order, is_required } = req.body;

      const updates: { sortOrder?: number, isRequired?: boolean } = {};
      if (sort_order !== undefined) updates.sortOrder = sort_order;
      if (is_required !== undefined) updates.isRequired = !!is_required;

      const assignment = await storage.updatePropertyFormAssignment(orgId, propertyId, formId, updates);
      res.json(assignment);
    } catch (error) {
      console.error("Error updating property form assignment:", error);
      res.status(500).json({ message: "Failed to update form assignment" });
    }
  });

  // Staff Forms Management routes
  app.post("/api/staff/forms", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers["x-tenant-org"] as string;
      if (!orgId) {
        return res.status(400).json({ error: "x-tenant-org header required" });
      }

      const { name, description, schema } = req.body;
      if (!name || !schema) {
        return res.status(400).json({ error: "name and schema are required" });
      }

      const form = await storage.createForm({
        orgId,
        name,
        description: description || null,
        schema
      });

      res.status(201).json(form);
    } catch (error) {
      console.error("Error creating form:", error);
      res.status(500).json({ message: "Failed to create form" });
    }
  });

  // Property Centers Forms Assignment (matching your API pattern)
  // New route under admin/client-portal
  app.post("/api/admin/client-portal/:propertyId/forms", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers["x-tenant-org"] as string;
      const { propertyId } = req.params;
      const { form_id, sort_order, is_required } = req.body;

      if (!orgId) {
        return res.status(400).json({ error: "x-tenant-org header required" });
      }

      if (!form_id) {
        return res.status(400).json({ error: "form_id is required" });
      }

      const assignment = await storage.assignFormToProperty(
        orgId, 
        propertyId, 
        form_id, 
        sort_order ?? 0, 
        !!is_required
      );
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning form to property:", error);
      if (error.message === "Form not found") {
        res.status(404).json({ error: "Form not found" });
      } else {
        res.status(500).json({ message: "Failed to assign form to property" });
      }
    }
  });

  // Backward compatibility redirect for property-centers API
  app.post("/api/property-centers/:propertyId/forms", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers["x-tenant-org"] as string;
      const { propertyId } = req.params;
      const { form_id, sort_order, is_required } = req.body;

      if (!orgId) {
        return res.status(400).json({ error: "x-tenant-org header required" });
      }

      if (!form_id) {
        return res.status(400).json({ error: "form_id is required" });
      }

      const assignment = await storage.assignFormToProperty(
        orgId, 
        propertyId, 
        form_id, 
        sort_order ?? 0, 
        !!is_required
      );
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning form to property:", error);
      if (error.message === "Form not found") {
        res.status(404).json({ error: "Form not found" });
      } else {
        res.status(500).json({ message: "Failed to assign form to property" });
      }
    }
  });

  // Backward compatibility redirects for property portal settings
  app.get("/api/orgs/:orgId/properties/:propertyId/portal-settings", (req, res) => {
    const { orgId, propertyId } = req.params;
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const redirectUrl = `/api/admin/client-portal/${orgId}/${propertyId}/settings${queryString ? `?${queryString}` : ''}`;
    res.redirect(308, redirectUrl);
  });

  app.post("/api/orgs/:orgId/properties/:propertyId/portal-settings", (req, res) => {
    const { orgId, propertyId } = req.params;
    const redirectUrl = `/api/admin/client-portal/${orgId}/${propertyId}/settings`;
    res.redirect(308, redirectUrl);
  });

  // New admin client portal API routes
  app.get("/api/admin/client-portal/:orgId/:propertyId/settings", isAuthenticated, async (req, res) => {
    try {
      const { orgId, propertyId } = req.params;
      const { status } = req.query;
      
      if (status) {
        const settings = await storage.getLatestPropertyPortalSettings(orgId, parseInt(propertyId), status as string);
        return res.json(settings || null);
      } else {
        const allSettings = await storage.getPropertyPortalSettings(orgId, parseInt(propertyId));
        return res.json(allSettings);
      }
    } catch (error) {
      console.error("Error fetching property portal settings:", error);
      res.status(500).json({ message: "Failed to fetch property portal settings" });
    }
  });

  app.post("/api/admin/client-portal/:orgId/:propertyId/settings", isAuthenticated, async (req, res) => {
    try {
      const { orgId, propertyId } = req.params;
      
      const brandingLevel = await getBrandingLevel(orgId);
      const brandingData = {
        branding: req.body.branding || {},
        theme: req.body.theme || {}
      };
      const allowedBranding = enforceBrandingPolicy(brandingLevel, brandingData);
      
      const existingSettings = await storage.getPropertyPortalSettings(orgId, parseInt(propertyId));
      const nextVersion = existingSettings.length > 0 ? Math.max(...existingSettings.map(s => s.version)) + 1 : 1;
      
      const settingsData = {
        orgId,
        propertyId: parseInt(propertyId),
        version: nextVersion,
        status: req.body.status || "draft",
        branding: allowedBranding.branding,
        theme: allowedBranding.theme,
        layout: req.body.layout || {},
        modulesEnabled: req.body.modulesEnabled || { taskRequests: true, messages: true },
        copy: req.body.copy || {},
        legal: req.body.legal || {},
        i18n: req.body.i18n || { defaultLocale: "en", supportedLocales: ["en"] },
        featureFlags: req.body.featureFlags || [],
        authOptions: req.body.authOptions || { allowedLogin: "both", mfa: "sms" }
      };
      
      const parsedData = insertPropertyPortalSettingsSchema.parse(settingsData);
      const settings = await storage.createPropertyPortalSettings(parsedData);
      
      res.status(201).json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating property portal settings:", error);
      res.status(500).json({ message: "Failed to create property portal settings" });
    }
  });

  app.post("/api/admin/client-portal/:orgId/:propertyId/settings/publish", isAuthenticated, async (req, res) => {
    try {
      const { orgId, propertyId } = req.params;
      const { version } = req.body;
      
      const settings = await storage.publishPropertyPortalSettings(orgId, parseInt(propertyId), version);
      res.json(settings);
    } catch (error) {
      console.error("Error publishing property portal settings:", error);
      res.status(500).json({ message: "Failed to publish property portal settings" });
    }
  });

  // ===== ADMIN API ALIASES =====
  // These routes provide the new admin namespace while keeping existing logic
  
  // 2a) Preview, Publish, Draft Save aliases
  app.get("/api/admin/client-portal/:propertyId/preview", (req, res, next) => {
    // Alias to existing property-centers preview logic
    req.url = req.url.replace("/api/admin/client-portal/", "/api/property-centers/");
    next();
  });

  app.post("/api/admin/client-portal/:propertyId/publish", (req, res, next) => {
    // Alias to existing property-centers publish logic
    req.url = req.url.replace("/api/admin/client-portal/", "/api/property-centers/");
    next();
  });

  app.put("/api/admin/client-portal/:propertyId/config", (req, res, next) => {
    // Alias to existing property-centers config logic
    req.url = req.url.replace("/api/admin/client-portal/", "/api/property-centers/");
    next();
  });

  // 2b) Forms assignment aliases (per property)  
  app.get("/api/admin/client-portal/:propertyId/forms", (req, res, next) => {
    // Alias to existing property-centers forms logic
    req.url = req.url.replace("/api/admin/client-portal/", "/api/property-centers/");
    next();
  });

  app.post("/api/admin/client-portal/:propertyId/forms", (req, res, next) => {
    // Alias to existing property-centers forms logic
    req.url = req.url.replace("/api/admin/client-portal/", "/api/property-centers/");
    next();
  });

  app.delete("/api/admin/client-portal/:propertyId/forms", (req, res, next) => {
    // Alias to existing property-centers forms logic  
    req.url = req.url.replace("/api/admin/client-portal/", "/api/property-centers/");
    next();
  });

  // 2c) Forms library aliases (org level)
  app.get("/api/admin/forms", (req, res, next) => {
    // Alias to existing staff forms logic
    req.url = req.url.replace("/api/admin/forms", "/api/staff/forms");
    next();
  });

  app.post("/api/admin/forms", (req, res, next) => {
    // Alias to existing staff forms logic
    req.url = req.url.replace("/api/admin/forms", "/api/staff/forms");
    next();
  });

  app.patch("/api/admin/forms", (req, res, next) => {
    // Alias to existing staff forms logic
    req.url = req.url.replace("/api/admin/forms", "/api/staff/forms");
    next();
  });

  // Client Forms API (forms available to clients for a property)
  app.get("/api/client/forms", async (req, res) => {
    try {
      const orgId = req.headers["x-tenant-org"] as string;
      const { property_id } = req.query;
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

      if (!orgId) {
        return res.status(400).json({ error: "x-tenant-org header required" });
      }

      if (!token) {
        return res.status(401).json({ error: "Client authentication required" });
      }

      if (!property_id) {
        return res.status(400).json({ error: "property_id query parameter required" });
      }

      // In a real implementation, you would verify the JWT token here
      // For now, we'll proceed with the property forms lookup
      const propertyForms = await storage.getPropertyForms(orgId, property_id as string);
      res.json(propertyForms);
    } catch (error) {
      console.error("Error fetching client forms:", error);
      res.status(500).json({ message: "Failed to fetch forms" });
    }
  });

  // Client Form Submission (matching your production pattern)
  app.post("/api/client/forms/:formId/submit", async (req, res) => {
    try {
      const orgId = req.headers["x-tenant-org"] as string;
      const { formId } = req.params;
      const { property_id, answers, files } = req.body;
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

      if (!orgId) {
        return res.status(400).json({ error: "x-tenant-org header required" });
      }

      if (!token) {
        return res.status(401).json({ error: "Client authentication required" });
      }

      if (!property_id || !answers) {
        return res.status(400).json({ error: "property_id and answers are required" });
      }

      // In a real implementation, you would extract client_id from JWT token
      // For testing, we'll use a placeholder client ID
      const clientId = "test-client-from-jwt";

      // Validate form submission
      const validation = await storage.validateFormSubmission(orgId, property_id, formId, answers);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.errors.join(", ") });
      }

      // Create submission
      const submission = await storage.createFormSubmission({
        orgId,
        propertyId: property_id,
        formId,
        submittedByClientId: clientId,
        answers,
        files: files || [],
        status: "received"
      });

      res.status(201).json({ ok: true, submission_id: submission.id });
    } catch (error) {
      console.error("Error creating form submission:", error);
      res.status(500).json({ message: "Failed to create form submission" });
    }
  });

  // Legacy endpoint for testing (keeping for backward compatibility)
  app.post("/api/orgs/:orgId/forms/:formId/submit", async (req, res) => {
    try {
      const { orgId, formId } = req.params;
      const { property_id, answers, files, client_id } = req.body;

      if (!client_id) {
        return res.status(401).json({ error: "Client authentication required" });
      }

      if (!property_id || !answers) {
        return res.status(400).json({ error: "property_id and answers are required" });
      }

      const validation = await storage.validateFormSubmission(orgId, property_id, formId, answers);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.errors.join(", ") });
      }

      const submission = await storage.createFormSubmission({
        orgId,
        propertyId: property_id,
        formId,
        submittedByClientId: client_id,
        answers,
        files: files || [],
        status: "received"
      });

      res.status(201).json({ ok: true, submission_id: submission.id });
    } catch (error) {
      console.error("Error creating form submission:", error);
      res.status(500).json({ message: "Failed to create form submission" });
    }
  });

  // Form Submissions management routes (staff-facing)
  app.get("/api/orgs/:orgId/form-submissions", isAuthenticated, async (req, res) => {
    try {
      const { orgId } = req.params;
      const { property_id, form_id } = req.query;
      
      const submissions = await storage.getFormSubmissions(
        orgId, 
        property_id as string, 
        form_id as string
      );
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching form submissions:", error);
      res.status(500).json({ message: "Failed to fetch form submissions" });
    }
  });

  app.get("/api/orgs/:orgId/form-submissions/:submissionId", isAuthenticated, async (req, res) => {
    try {
      const { orgId, submissionId } = req.params;
      const submission = await storage.getFormSubmission(orgId, submissionId);
      
      if (!submission) {
        return res.status(404).json({ message: "Form submission not found" });
      }
      
      res.json(submission);
    } catch (error) {
      console.error("Error fetching form submission:", error);
      res.status(500).json({ message: "Failed to fetch form submission" });
    }
  });

  app.patch("/api/orgs/:orgId/form-submissions/:submissionId/status", isAuthenticated, async (req, res) => {
    try {
      const { orgId, submissionId } = req.params;
      const { status } = req.body;
      
      if (!["received", "in_review", "accepted", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }

      const submission = await storage.updateFormSubmissionStatus(orgId, submissionId, status);
      res.json(submission);
    } catch (error) {
      console.error("Error updating form submission status:", error);
      res.status(500).json({ message: "Failed to update form submission status" });
    }
  });

  // Client portal routes
  app.get("/api/orgs/:orgId/clients", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const clients = await storage.getClients(orgId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post("/api/orgs/:orgId/clients", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const clientData = { ...req.body, orgId };
      
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
