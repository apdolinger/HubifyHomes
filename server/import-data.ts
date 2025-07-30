import { storage } from "./storage";

// Sample data from the CSV file
const csvData = [
  {
    fullName: "Bruce Wayne",
    propertyName: "Wayne Manor",
    streetAddress: "1313 Mockingbird Ln.",
    city: "Gotham City",
    county: "Bristol County",
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
    county: "Ventura County",
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
    county: "Shire County",
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
    county: "Nassau County",
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
    county: "Northern Peaks County",
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
    county: "Republic County",
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
    county: "Greater London",
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
    county: "Surrey County",
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
    county: "Sierra County",
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
    county: "Sweet County",
    state: "PA",
    zipCode: "15001",
    phoneNumber: "(720) 511-5742",
    email: "willy.wonka@example.com",
    tasks: "Sanitize chocolate river filter; Inspect candy wall"
  }
];

export async function importSampleData() {
  console.log("Starting data import...");
  
  try {
    for (const record of csvData) {
      console.log(`Processing ${record.fullName}...`);
      
      // Split full name into first and last
      const nameParts = record.fullName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');
      
      // Create property first
      const property = await storage.createProperty({
        name: record.propertyName,
        type: "house", // Default type
        address1: record.streetAddress,
        address2: "",
        city: record.city,
        state: record.state,
        zipCode: record.zipCode,
        status: "active",
        units: 1,
        squareFootage: 2500, // Default value
        yearBuilt: 1980, // Default value
        isActive: true,
        managerId: null // Will be set later if needed
      }, "system-import");
      
      console.log(`Created property: ${property.name}`);
      
      // Create contact for this property
      const contact = await storage.createContact({
        firstName,
        lastName,
        email: record.email,
        phone: record.phoneNumber,
        type: "owner", // Assuming property owner
        propertyId: property.id,
        isActive: true
      }, "system-import");
      
      console.log(`Created contact: ${contact.firstName} ${contact.lastName}`);
      
      // Create tasks from the tasks string
      const taskList = record.tasks.split(';').map(task => task.trim());
      
      for (const taskTitle of taskList) {
        if (taskTitle) {
          const task = await storage.createTask({
            title: taskTitle,
            description: `Task for ${record.propertyName}`,
            priority: "normal", // Default priority
            status: "pending",
            propertyId: property.id,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 1 week
            assignedToId: null,
            assignedById: null
          }, "system-import");
          
          console.log(`Created task: ${task.title}`);
        }
      }
    }
    
    console.log("Data import completed successfully!");
    return { success: true, message: "All data imported successfully" };
    
  } catch (error) {
    console.error("Error during data import:", error);
    return { success: false, message: `Import failed: ${error}` };
  }
}