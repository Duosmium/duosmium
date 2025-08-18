import os
import yaml
import requests
import csv
from io import StringIO

# URL for the schools database
SCHOOLS_CSV_URL = "https://duosmium.org/results/schools.csv"

# Path to the results directory
results_dir = 'data/results'

# 1. Download and parse the schools CSV to build a unique school-to-city map
print("Downloading and parsing schools database...")
school_city_map = {}
try:
    response = requests.get(SCHOOLS_CSV_URL)
    response.raise_for_status()
    csv_data = StringIO(response.text)
    reader = csv.reader(csv_data)
    next(reader)  # Skip the header row
    for row in reader:
        if len(row) >= 3:
            school_name = row[0].strip()
            city_name = row[1].strip()
            state_name = row[2].strip()
            if school_name and city_name and state_name:
                # Use a tuple (school, state) as the unique key
                key = (school_name, state_name)
                school_city_map[key] = city_name
except Exception as e:
    print(f"Error downloading or parsing CSV file: {e}")
    exit()

print(f"Found {len(school_city_map)} unique schools with cities from the database.")

# 2. Iterate through local YAML files and add missing city data
print("Updating files with missing city data...")
files_updated = []
for root, _, files in os.walk(results_dir):
    for filename in files:
        if filename.endswith('.yaml'):
            filepath = os.path.join(root, filename)

            with open(filepath, 'r') as f:
                lines = f.readlines()

            updated_lines = []
            made_change = False
            i = 0
            while i < len(lines):
                line = lines[i]
                updated_lines.append(line)

                # Look for 'school:' and 'state:' lines
                if 'school:' in line and i + 1 < len(lines):
                    school_name = line.split(':', 1)[1].strip()
                    
                    # Find the state by searching subsequent lines
                    state_name = None
                    temp_i = i + 1
                    while temp_i < len(lines) and 'state:' not in lines[temp_i]:
                        temp_i += 1
                    if temp_i < len(lines):
                        state_name = lines[temp_i].split(':', 1)[1].strip()

                    # Check for a missing city and a unique key in the map
                    if 'city:' not in lines[i+1] and school_name and state_name:
                        key = (school_name, state_name)
                        if key in school_city_map:
                            city_name = school_city_map[key]
                            
                            # Get indentation from the school line
                            indentation = len(line) - len(line.lstrip())
                            
                            # Insert the new city line with proper indentation
                            updated_lines.append(' ' * indentation + f"city: {city_name}\n")
                            made_change = True
                
                i += 1

            if made_change:
                with open(filepath, 'w') as f:
                    f.writelines(updated_lines)
                files_updated.append(filepath)

if files_updated:
    print("\nFiles updated successfully:")
    for f in files_updated:
        print(f"- {f}")
    print("\nRemember to review and commit the changes.")
else:
    print("No updates were necessary.")