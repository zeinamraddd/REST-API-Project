import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3000;

// middleware to read json requests
app.use(express.json());

// connect to Mongodb
const client = new MongoClient(process.env.MONGODB_URI);

async function startServer() {
  try {
    await client.connect();
    console.log('Connected to MongoDB!');

    const db = client.db('notesdb');
    const notes = db.collection('notes');

    // GET all notes
    app.get('/api/notes', async (req, res) => {
      try {
        const allNotes = await notes.find().toArray();
        res.status(200).json(allNotes);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to fetch notes'
        });
      }
    });

    
    // GET a single note by ID
    app.get('/api/notes/:id', async (req, res) => {
      try {
        const { id } = req.params;

        // validate MongoDB ID
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            error: 'Invalid note ID'
          });
        }

        // find the note
        const note = await notes.findOne({
          _id: new ObjectId(id)
        });

        // check if note exists
        if (!note) {
          return res.status(404).json({
            error: 'Note not found'
          });
        }

        res.status(200).json(note);

      } catch (error) {
        res.status(500).json({
          error: 'Failed to fetch note'
        });
      }
    });




    // POST - create a new note
    app.post('/api/notes', async (req, res) => {
      try {
        const { title, body } = req.body || {};

        // validate the title
        if (typeof title !== 'string' || !title.trim()) {
          return res.status(400).json({
            error: 'Title is required'
          });
        }

        // validate the body if provided
        if (body !== undefined && typeof body !== 'string') {
          return res.status(400).json({
            error: 'Body must be a string'
          });
        }

        // create the note
        const note = {
          title: title.trim(),
          body: body || '',
          createdAt: new Date().toISOString()
        };

        // save to MongoDB
        const result = await notes.insertOne(note);

        // return the created note
        res.status(201).json({
          ...note,
          _id: result.insertedId
        });

      } catch (error) {
        res.status(500).json({
          error: 'Failed to create note'
        });
      }
    });

    
    // PUT - replace an existing note
    app.put('/api/notes/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const { title, body } = req.body || {};

        // validate the ID
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            error: 'Invalid note ID'
          });
        }

        // validate the new note
        if (typeof title !== 'string' || !title.trim() ||
            typeof body !== 'string') {
          return res.status(400).json({
            error: 'Valid title and body are required'
          });
        }

        // update the note in MongoDB
        const result = await notes.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              title: title.trim(),
              body: body
            }
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({
            error: 'Note not found'
          });
        }

        res.status(200).json({
          message: 'Note updated successfully'
        });

      } catch (error) {
        res.status(500).json({
          error: 'Failed to update note'
        });
      }
    });

    
    // PATCH - partially update a note
    app.patch('/api/notes/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const { title, body } = req.body || {};

        // validate the ID
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            error: 'Invalid note ID'
          });
        }

        // validate the provided fields
        if (title === undefined && body === undefined) {
          return res.status(400).json({
            error: 'Provide at least one field to update'
          });
        }

        if (title !== undefined &&
            (typeof title !== 'string' || !title.trim())) {
          return res.status(400).json({
            error: 'Title must be a non-empty string'
          });
        }

        if (body !== undefined && typeof body !== 'string') {
          return res.status(400).json({
            error: 'Body must be a string'
          });
        }

        // build the fields to update
        const updates = {};

        if (title !== undefined) {
          updates.title = title.trim();
        }

        if (body !== undefined) {
          updates.body = body;
        }

        // update only the provided fields
        const result = await notes.updateOne(
          { _id: new ObjectId(id) },
          { $set: updates }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({
            error: 'Note not found'
          });
        }

        res.status(200).json({
          message: 'Note partially updated successfully'
        });

      } catch (error) {
        res.status(500).json({
          error: 'Failed to update note'
        });
      }
    });

    
    // DELETE - remove a note
    app.delete('/api/notes/:id', async (req, res) => {
      try {
        const { id } = req.params;

        // validate the ID
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            error: 'Invalid note ID'
          });
        }

        // delete the note from MongoDB
        const result = await notes.deleteOne({
          _id: new ObjectId(id)
        });

        // check if the note exists
        if (result.deletedCount === 0) {
          return res.status(404).json({
            error: 'Note not found'
          });
        }

        // successfully deleted
        res.status(204).send();

      } catch (error) {
        res.status(500).json({
          error: 'Failed to delete note'
        });
      }
    });


    // test route
    app.get('/', (req, res) => {
      res.json({
        message: 'Notes API is running!'
      });
    });

    // start the server
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
  }
}

startServer();
