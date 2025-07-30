// Direct import execution
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
  }
];

console.log("Import data prepared:");
console.log("Records to import:", csvData.length);
csvData.forEach((record, i) => {
  console.log(`${i+1}. ${record.fullName} - ${record.propertyName}`);
});