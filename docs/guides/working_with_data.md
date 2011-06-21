# Working With Data

Kanso includes some tools for working with CouchDB documents on the filesystem.
These commands use a streaming JSON parser to handle large documents.


## Data formats

The documents are stored in JSON format and each file can contain either a single
document or an array of documents.

Example .json file with a single document:

    {
        "year": 1997,
        "make": "Ford",
        "model": "E350",
        "description": "ac, abs, moon",
        "price": 3000.00
    }

Example .json file with multiple documents:

    [
        {
            "year": 1997,
            "make": "Ford",
            "model": "E350",
            "description": "ac, abs, moon",
            "price": 3000
        },
        {
            "year": 1999,
            "make": "Chevy",
            "model": "Venture \"Extended Edition\"",
            "description": "",
            "price": 4900
        }
    ]


## Pushing a basic document

Create an <code>example.json</code> file containing some simple data structure
(such as first example above). In a Kanso project, this would normally be stored
inside a 'data' directory.

You can then push the document to a CouchDB database using the following command:

<pre><code class="no-highlight">kanso pushdata http://localhost:5984/dbname data/example.json</code></pre>

If you attempted to push the above example documents, you'll get an error reporting
that the documents are missing \_id attributes. The pushdata command requires \_id
attributes to avoid duplicating data in the database. Otherwise, multiple
pushdata commands would duplicate the data and it might be complicated to untangle.
This could get even more confusing if the documents are pushed to multiple dbs
replicating with each other. By forcing all documents to have an \_id before
pushing, conflicts will be properly detected.

Either add \_id attributes to the JSON documents yourself, or add them
automatically with the following command:

    kanso transform add-ids data/example.json data/example_with_ids.json

Once the documents have an \_id, the pushdata command should succeed.
You can also push an entire directory of data files:

<pre><code class="no-highlight">kanso pushdata http://localhost:5984/dbname data</code></pre>


## Converting from CSV

The Comma-separated Values (CSV) format is commonly used and usually easy to
export to from other systems. Kanso provides a CSV transform tool for converting
.csv files to JSON.

We're going to import the following CSV data:

    year,make,model,description,price
    1997,Ford,E350,"ac, abs, moon",3000.00
    1999,Chevy,"Venture ""Extended Edition""","",4900.00
    1999,Chevy,"Venture ""Extended Edition, Very Large""","",5000.00
    1996,Jeep,Grand Cherokee,"MUST SELL!
    air, moon roof, loaded",4799.00

Create the file <code>example.csv</code> with the above data. You can then convert
it to JSON using the following command:

    kanso transform csv example.csv example.json

The first row of the .csv file is used for the property names for each column.
You can generate a larger, but nicely formatted file using the following command:

    kanso transform csv example.csv example.json --indent=4

This will save the following output to <code>example.json</code>:

    [
        {
            "year": "1997",
            "make": "Ford",
            "model": "E350",
            "description": "ac, abs, moon",
            "price": "3000.00"
        },
        {
            "year": "1999",
            "make": "Chevy",
            "model": "Venture \"Extended Edition\"",
            "price": "4900.00"
        },
        {
            "year": "1999",
            "make": "Chevy",
            "model": "Venture \"Extended Edition, Very Large\"",
            "price": "5000.00"
        },
        {
            "year": "1996",
            "make": "Jeep",
            "model": "Grand Cherokee",
            "description": "MUST SELL!\nair, moon roof, loaded",
            "price": "4799.00"
        }
    ]

You'll notice that all values are interpreted as strings, since the CSV format does
not distinguish between strings and numbers. You can however, tell Kanso to also
convert these values to native types when converting from CSV. To do this, use
the <code>format</code> option:

<pre><code class="no-highlight">kanso transform csv example.csv example.json --indent=4 \
    --format="number,string,string,string,number"</code></pre>

You can only use the basic JSON types: string, number, boolean. The types are
defined in the order of the columns they apply to. The above command will save
the following to <code>example.json</code>:

    [
        {
            "year": 1997,
            "make": "Ford",
            "model": "E350",
            "description": "ac, abs, moon",
            "price": 3000
        },
        {
            "year": 1999,
            "make": "Chevy",
            "model": "Venture \"Extended Edition\"",
            "description": "",
            "price": 4900
        },
        {
            "year": 1999,
            "make": "Chevy",
            "model": "Venture \"Extended Edition, Very Large\"",
            "description": "",
            "price": 5000
        },
        {
            "year": 1996,
            "make": "Jeep",
            "model": "Grand Cherokee",
            "description": "MUST SELL!\nair, moon roof, loaded",
            "price": 4799
        }
    ]

As explained earlier in this guide, before you push this data to CouchDB you'll
need to add \_id attributes to each of these documents. You can do this using
the following command:

    kanso transform add-ids example.json example_with_ids.json

If for any reason you wanted to clear these \_id properties again, you can do that
with the following command:

    kanso transform clear-ids example_with_ids.json example_without_ids.json
