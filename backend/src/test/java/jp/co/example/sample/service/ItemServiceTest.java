package jp.co.example.sample.service;

import jp.co.example.sample.dto.Item;
import jp.co.example.sample.dto.ItemCreate;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class ItemServiceTest {

    @Test
    void listAll_initiallyEmpty() {
        ItemService svc = new ItemService();
        assertEquals(List.of(), svc.listAll());
    }

    @Test
    void create_assignsIdAndStores() {
        ItemService svc = new ItemService();
        Item created = svc.create(new ItemCreate("ペン", 200));
        assertEquals(1L, created.id());
        assertEquals("ペン", created.name());
        assertEquals(1, svc.listAll().size());
    }

    @Test
    void getById_returnsOptional() {
        ItemService svc = new ItemService();
        Item created = svc.create(new ItemCreate("ノート", 800));
        Optional<Item> got = svc.getById(created.id());
        assertTrue(got.isPresent());
        assertEquals("ノート", got.get().name());
        assertTrue(svc.getById(999L).isEmpty());
    }

    @Test
    void delete_returnsTrueIfExisted() {
        ItemService svc = new ItemService();
        Item created = svc.create(new ItemCreate("椅子", 8000));
        assertTrue(svc.delete(created.id()));
        assertFalse(svc.delete(created.id()));
        assertEquals(0, svc.listAll().size());
    }

    @Test
    void create_assignsIncrementingIds() {
        ItemService svc = new ItemService();
        Item a = svc.create(new ItemCreate("A", 100));
        Item b = svc.create(new ItemCreate("B", 200));
        assertEquals(1L, a.id());
        assertEquals(2L, b.id());
    }
}
