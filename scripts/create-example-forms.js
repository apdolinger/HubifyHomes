// Script to create example forms with specific contexts and fields
const exampleForms = [
  {
    formTitle: "New Client Request",
    slug: "new-client-request",
    contexts: ["people", "property"],
    internalDescription: "Form for new clients to provide their contact info and property details",
    allowMultipleSubmissions: false,
    matchExistingBy: "email",
    triggerAutomation: true,
    fields: [
      {
        label: "First Name",
        description: "Your first name as it appears on official documents",
        type: "text",
        required: true,
        profileFieldKey: "firstName"
      },
      {
        label: "Last Name", 
        description: "Your last name as it appears on official documents",
        type: "text",
        required: true,
        profileFieldKey: "lastName"
      },
      {
        label: "Phone Number",
        description: "Primary phone number where we can reach you",
        type: "tel",
        required: true,
        profileFieldKey: "phone"
      },
      {
        label: "Property Address",
        description: "Full address of the property you need services for",
        type: "text", 
        required: true,
        profileFieldKey: "address"
      },
      {
        label: "Square Footage",
        description: "Approximate square footage of your property",
        type: "number",
        required: false,
        profileFieldKey: "squareFootage"
      }
    ]
  },
  {
    formTitle: "Client Task Request",
    slug: "client-task-request", 
    contexts: ["task"],
    internalDescription: "Form for clients to submit service requests and tasks",
    allowMultipleSubmissions: true,
    matchExistingBy: "email",
    triggerAutomation: true,
    fields: [
      {
        label: "Task Title",
        description: "Brief description of the service or task needed",
        type: "text",
        required: true,
        profileFieldKey: "taskTitle"
      },
      {
        label: "Task Description",
        description: "Detailed description of what needs to be done",
        type: "textarea",
        required: true,
        profileFieldKey: "taskDescription"
      },
      {
        label: "Requested Date",
        description: "When would you like this completed?",
        type: "date",
        required: false,
        profileFieldKey: "requestedDate"
      },
      {
        label: "Priority Level",
        description: "How urgent is this request?",
        type: "select",
        required: false,
        profileFieldKey: "priority",
        options: ["Low", "Medium", "High"]
      }
    ]
  },
  {
    formTitle: "Property Update",
    slug: "property-update",
    contexts: ["property"],
    internalDescription: "Form to update property information and details",
    allowMultipleSubmissions: true,
    matchExistingBy: "none",
    triggerAutomation: false,
    fields: [
      {
        label: "Square Footage",
        description: "Updated square footage measurement",
        type: "number",
        required: false,
        profileFieldKey: "squareFootage"
      },
      {
        label: "Number of Bedrooms",
        description: "Total number of bedrooms in the property",
        type: "number", 
        required: false,
        profileFieldKey: "bedrooms"
      },
      {
        label: "Garage Spots",
        description: "Number of vehicles the garage can accommodate",
        type: "number",
        required: false,
        profileFieldKey: "garageSpots"
      },
      {
        label: "Room List",
        description: "List of all rooms and spaces in the property",
        type: "textarea",
        required: false,
        profileFieldKey: "roomList"
      },
      {
        label: "Supplies Needed",
        description: "List of supplies or materials needed for maintenance",
        type: "textarea", 
        required: false,
        profileFieldKey: "supplies"
      }
    ]
  }
];

// Function to create forms via API
async function createExampleForms() {
  const baseURL = 'http://localhost:5000';
  
  for (const formData of exampleForms) {
    try {
      const response = await fetch(`${baseURL}/api/forms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formTitle: formData.formTitle,
          slug: formData.slug,
          contexts: formData.contexts,
          description: formData.internalDescription,
          schema: {
            allowMultipleSubmissions: formData.allowMultipleSubmissions,
            matchExistingBy: formData.matchExistingBy,
            triggerAutomation: formData.triggerAutomation,
            fields: formData.fields
          }
        })
      });
      
      if (response.ok) {
        console.log(`✓ Created form: ${formData.formTitle}`);
      } else {
        console.error(`✗ Failed to create form: ${formData.formTitle}`, await response.text());
      }
    } catch (error) {
      console.error(`✗ Error creating form: ${formData.formTitle}`, error);
    }
  }
}

if (typeof window === 'undefined') {
  // Node.js environment
  createExampleForms();
} else {
  // Browser environment
  window.createExampleForms = createExampleForms;
  console.log('Example forms script loaded. Call createExampleForms() to create forms.');
}