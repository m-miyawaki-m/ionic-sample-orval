package jp.co.example.sample.service;

import jp.co.example.sample.dto.Item;
import jp.co.example.sample.dto.ItemCreate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class ItemService {
    private final List<Item> items = new ArrayList<>();
    private final AtomicLong nextId = new AtomicLong(1);

    public synchronized List<Item> listAll() {
        return List.copyOf(items);
    }

    public synchronized Item create(ItemCreate src) {
        Item created = new Item(nextId.getAndIncrement(), src.name(), src.price());
        items.add(created);
        return created;
    }

    public synchronized Optional<Item> getById(Long id) {
        return items.stream().filter(i -> i.id().equals(id)).findFirst();
    }

    public synchronized boolean delete(Long id) {
        return items.removeIf(i -> i.id().equals(id));
    }
}
